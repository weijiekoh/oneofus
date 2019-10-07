// The MiMCSponge contract is not written in Solidity. Instead, its bytecode is
// generated by circomlib/src/mimcsponge_gencontract.js.
//
// Most (if not all) Solidity tooling frameworks, like Etherlime or Truffle,
// do not integrate the solc binary and therefore take ages to compile
// contracts.
//
// This script does the following:
//
// 1. Build the MiMC contract bytecode and deploy it to the Ethereum node
//    specified by --rpcUrl.
// 2. Copy Solidity files from the semaphore submodule to sol/semaphore
// 2. Compile the Solidity files specified by --input using the solc binary
//    specified by --solc. All output files will be in the directory specified
//    by --out.
// 3. Link the MiMC contract address to hardcoded contract(s) (just
//    MerkleTreeLib for now)
// 4. Deploy the rest of the contracts


import { config } from 'ao-config'
import { ArgumentParser } from 'argparse'
import * as shell from 'shelljs'
import * as path from 'path'
import * as fs from 'fs'
import * as ethers from 'ethers'

const mimcGenContract = require('circomlib/src/mimcsponge_gencontract.js')
const MIMC_SEED = 'mimcsponge'

const buildMimcBytecode = () => {
    return mimcGenContract.createCode(MIMC_SEED, 220)
}

const execute = (cmd: string) => {
    const result = shell.exec(cmd, { silent: false })
    if (result.code !== 0) {
        throw 'Error executing ' + cmd
    }

    return result
}

const readFile = (abiDir: string, filename: string) => {
    return fs.readFileSync(path.join(abiDir, filename)).toString()
}

const compileAbis = async (
    abiDir: string,
    solDir: string,
    solcBinaryPath: string = 'solc',
) => {
    shell.mkdir('-p', abiDir)
    const solcCmd = `${solcBinaryPath} -o ${abiDir} ${solDir}/*.sol --overwrite --abi`
    const result = execute(solcCmd)

    // Copy ABIs to the frontend and backend modules
    shell.mkdir('-p', '../frontend/abi/')
    shell.mkdir('-p', '../backend/abi/')

    shell.ls(path.join(abiDir, '*.abi')).forEach((file) => {
        const baseName = path.basename(file)
        shell.cp('-R', file, `../backend/abi/${baseName}.json`)
        shell.cp('-R', file, `../frontend/abi/${baseName}.json`)
    })
}

const compileAndDeploy = async (
    abiDir: string,
    solDir: string,
    solcBinaryPath: string = 'solc',
    rpcUrl: string = config.chain.url,
    deployKeyPath: string = config.chain.keys.deployPath,
    nftAddress?: string,
) => {

    const readAbiAndBin = (name: string) => {
        const abi = readFile(abiDir, name + '.abi')
        const bin = readFile(abiDir, name + '.bin')
        return { abi, bin }
    }

    // copy Semaphore files
    const semaphorePathPrefix = '../semaphore/semaphorejs/contracts/'
    const semaphoreTargetPath = path.join(solDir, 'semaphore')
    shell.mkdir('-p', semaphoreTargetPath)

    const semaphoreSolFiles = ['Semaphore.sol', 'MerkleTreeLib.sol', 'Ownable.sol']
    for (let file of semaphoreSolFiles) {
        shell.cp('-f', path.join(semaphorePathPrefix, file), semaphoreTargetPath)
    }

    shell.cp('-f', path.join(semaphorePathPrefix, '../build/verifier.sol'), semaphoreTargetPath)

    // Build MiMC bytecode
    const mimcBin = buildMimcBytecode()

    // compile contracts
    shell.mkdir('-p', abiDir)
    const solcCmd = `${solcBinaryPath} -o ${abiDir} ${solDir}/*.sol --overwrite --optimize --abi --bin`
    const result = execute(solcCmd)

    // create provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const deployKey = fs.readFileSync(deployKeyPath).toString().trim()
    const wallet = new ethers.Wallet(deployKey, provider)

    // deploy MiMC
    const mimcAbi = mimcGenContract.abi
    const mimcContractFactory = new ethers.ContractFactory(mimcAbi, mimcBin, wallet)

    const mimcContract = await mimcContractFactory.deploy(
        {gasPrice: ethers.utils.parseUnits('10', 'gwei')}
    )
    await mimcContract.deployed()
    console.log('MiMC deployed at', mimcContract.address)

    // link contracts to MiMC
    const filesToLink = ['semaphore/MerkleTreeLib.sol']
    for (let fileToLink of filesToLink) {
        const filePath = path.join(solDir, fileToLink)
        const linkCmd = `${solcCmd} --libraries ${filePath}:MiMC:${mimcContract.address}`
        execute(linkCmd)
    }

    // deploy or connect to the POAP contract
    const nftAbi = readFile(abiDir, 'Poap.abi')
    let nftContract

    if (nftAddress) {
        nftContract = new ethers.Contract(nftAddress, nftAbi, provider)
        console.log('Using existing NFT at', nftContract.address)
    } else {
        const nftBin = readFile(abiDir, 'Poap.bin')
        const nftContractFactory = new ethers.ContractFactory(nftAbi, nftBin, wallet)
        nftContract = await nftContractFactory.deploy()
        await nftContract.deployed()
        console.log('Deployed NFT at', nftContract.address)
    }

    // deploy Semaphore
    const semaphoreAB = readAbiAndBin('Semaphore')
    const semaphoreContractFactory = new ethers.ContractFactory(semaphoreAB.abi, semaphoreAB.bin, wallet)
    const semaphoreContract = await semaphoreContractFactory.deploy(
        config.chain.semaphoreTreeDepth, 0, 0,
        {gasPrice: ethers.utils.parseUnits('10', 'gwei')},
    )
    await semaphoreContract.deployed()

    console.log('Deployed Semaphore at', semaphoreContract.address)

    // deploy OneOfUs
    const oouAB = readAbiAndBin('OneOfUs')
    const oouContractFactory = new ethers.ContractFactory(oouAB.abi, oouAB.bin, wallet)
    const oouContract = await oouContractFactory.deploy(
        nftContract.address,
        semaphoreContract.address,
        config.chain.poapEventId,
        {gasPrice: ethers.utils.parseUnits('10', 'gwei')},
    )
    await oouContract.deployed()
    console.log('Deployed OneOfUs at', oouContract.address)

    // set the owner of the Semaphore contract to the OneOfUs contract address
    const tx = await semaphoreContract.transferOwnership(oouContract.address)
    await tx.wait()
    console.log('Transferred ownership of the Semaphore contract')

    if (config.chain.fundAndMintForTesting) {
        let i = 0

        for (let address of config.chain.fundAndMintForTesting) {
            let tx

            const id = Date.now() + i

            tx = await nftContract.mintToken(
                config.chain.poapEventId,
                id,
                address,
            )
            await tx.wait()
            console.log('Minted tokens to', address, 'with token ID', id)

            tx = await wallet.provider.sendTransaction(
                wallet.sign({
                    nonce: await wallet.provider.getTransactionCount(wallet.address),
                    gasPrice: ethers.utils.parseUnits('20', 'gwei'),
                    gasLimit: 21000,
                    to: address,
                    value: ethers.utils.parseEther('1'),
                    data: '0x'
                })
            )
            let receipt = await tx.wait()
            console.log('Gave away ETH to', address)

            i ++
        }
    }

	return {
		MiMC: mimcContract,
		Semaphore: semaphoreContract,
		NFT: nftContract,
        OneOfUs: oouContract,
	}
}


if (require.main === module) {
    const parser = new ArgumentParser({
        description: 'Build and deploy contracts'
    })

    parser.addArgument(
        ['-s', '--solc'],
        {
            help: 'The path to the solc binary',
            required: false,
        }
    )

    parser.addArgument(
        ['-r', '--rpcUrl'],
        {
            help: 'The JSON-RPC URL of the Ethereum node',
            required: false,
        }
    )

    parser.addArgument(
        ['-o', '--out'],
        {
            help: 'The output directory for compiled files',
            required: true,
        }
    )

    parser.addArgument(
        ['-i', '--input'],
        {
            help: 'The input directory with .sol files',
            required: true,
        }
    )

    parser.addArgument(
        ['-k', '--privKey'],
        {
            help: 'The private key to use to deploy the contracts',
            required: false,
        }
    )

    parser.addArgument(
        ['-m', '--mainnet'],
        {
            help: 'Use the NFT contract address configured at config.chain.nftAddress',
            action: 'storeTrue',
        }
    )

    parser.addArgument(
        ['-a', '--abi-only'],
        {
            help: 'Only generate ABI files',
            action: 'storeTrue',
        }
    )

    // parse command-line options
    const args = parser.parseArgs()

    const abiDir = path.resolve(args.out)
    const solDir = path.resolve(args.input)
    const solcBinaryPath = args.solc ? args.solc : 'solc'

    if (args.abi_only) {
        compileAbis(abiDir, solDir)
    } else {
        const deployKeyPath = args.privKey ? args.privKey : config.chain.deployKeyPath
        const rpcUrl = args.rpcUrl ? args.rpcUrl : config.chain.url
        const nftAddress = args.mainnet ? config.chain.nftAddress : null

        compileAndDeploy(abiDir, solDir, solcBinaryPath, rpcUrl, deployKeyPath, nftAddress)
    }
}

export {
    compileAndDeploy,
}
