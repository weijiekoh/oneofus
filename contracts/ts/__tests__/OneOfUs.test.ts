import { config } from 'ao-config'
import * as path from 'path'
import * as ethers from 'ethers'
import * as fs from 'fs'
import { signForRegistration } from '../index'
import { compileAndDeploy } from '../compileAndDeploy'
import {
    genIdentity,
    genIdentityCommitment,
    genPublicSignals,
    verifyProof,
    genWitness,
    genCircuit,
    genProof,
    genTree,
    parseVerifyingKeyJson,
    formatForVerifierContract,
} from 'libsemaphore'

const extractRevertReason = (e: any) => {
    return e.data[e.transactionHash].reason
}

jest.setTimeout(30000)

const circuitPath = path.join(
    __dirname,
    '../../../semaphore/semaphorejs/build/circuit.json',
) 
const provingKeyPath = path.join(
    __dirname,
    '../../../semaphore/semaphorejs/build/proving_key.bin',
) 
const verifyingKeyPath = path.join(
    __dirname,
    '../../../semaphore/semaphorejs/build/verification_key.json',
) 

const cirDef = JSON.parse(fs.readFileSync(circuitPath).toString())
const circuit = genCircuit(cirDef)
const provingKey = fs.readFileSync(provingKeyPath)
const verifyingKey = parseVerifyingKeyJson(fs.readFileSync(verifyingKeyPath).toString())

let adminWallet

let relayerWallet: ethers.Wallet
const userWallets: ethers.Wallet[] = []
const privateKeys = [
    '0x1111111111111111111111111111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222222222222222222222222222',
]


const genQuestionHash = (question: string): string => {
    const keccakHashed = ethers.utils.solidityKeccak256(['string'], [question])
    const sizedBuf = Buffer.alloc(29, keccakHashed.slice(2), 'hex')
    return '0x' + sizedBuf.toString('hex')
}

const question = 'Question'
const questionHash = genQuestionHash(question)

const answer = 'Answer'
const answerHash = ethers.utils.solidityKeccak256(['string'], [answer])

describe('the anonymous attendees-only forum app', () => {
    let contracts
    let identities = {}

    beforeAll(async () => {
        contracts = await compileAndDeploy(
            path.resolve('./abi'),
            path.resolve('./sol'),
            config.solcBinaryPath,
            config.chain.url,
            config.chain.keys.deploy,
        )

        adminWallet = contracts.NFT.signer

        for (let sk of privateKeys) {
            userWallets.push(
                new ethers.Wallet(sk, contracts.NFT.provider)
            )
        }

        const randWallet = ethers.Wallet.createRandom()
        relayerWallet = randWallet.connect(contracts.NFT.provider)

        // give away ETH
        const amountEth = '1'
        for (let wallet of userWallets) {
            const address = wallet.address
            const tx = await adminWallet.provider.sendTransaction(
                adminWallet.sign({
                    nonce: await adminWallet.provider.getTransactionCount(adminWallet.address),
                    gasPrice: 1,
                    gasLimit: 21000,
                    to: address,
                    value: ethers.utils.parseEther(amountEth),
                    data: '0x'
                })
            )
            await tx.wait()
            const balance = await adminWallet.provider.getBalance(address)
            expect(balance.gte(ethers.utils.parseEther(amountEth))).toBeTruthy()

        }

        const tx2 = await adminWallet.provider.sendTransaction(
            adminWallet.sign({
                nonce: await adminWallet.provider.getTransactionCount(adminWallet.address),
                gasPrice: 1,
                gasLimit: 21000,
                to: relayerWallet.address,
                value: ethers.utils.parseEther(amountEth),
                data: '0x'
            })
        )
        await tx2.wait()
    })

    test('deploy contracts', async () => {
        expect(contracts.OneOfUs.address).toHaveLength(42)
        expect(contracts.Semaphore.address).toHaveLength(42)
        expect(contracts.NFT.address).toHaveLength(42)
    })

    test('mint tokens', async () => {
        expect(await contracts.NFT.isMinter(adminWallet.address)).toBeTruthy()
        let tokenId = 0
        for (let wallet of userWallets) {
            await contracts.NFT.mintToken(config.chain.poapEventId, tokenId, wallet.address)
            tokenId ++
        }

        tokenId = 0
        for (let wallet of userWallets) {
            expect(await contracts.NFT.ownerOf(tokenId)).toEqual(wallet.address)
            tokenId ++
        }
    })

    test('Pre-fund the contract', async () => {
        const oouContract = contracts.OneOfUs.connect(adminWallet)
        const balanceBefore = await adminWallet.provider.getBalance(oouContract.address)

        const amount = '10'
        const tx = await adminWallet.provider.sendTransaction(
            adminWallet.sign({
                nonce: await adminWallet.provider.getTransactionCount(adminWallet.address),
                gasPrice: 1,
                gasLimit: 21040,
                to: oouContract.address,
                value: ethers.utils.parseEther(amount),
            })
        )
        await tx.wait()

        const balanceAfter = await adminWallet.provider.getBalance(oouContract.address)

        expect(balanceAfter.sub(balanceBefore) / (10 ** 18)).toEqual(Number(amount))
    })

    test('register identities', async () => {
        expect.assertions(userWallets.length * 5)
        const idComms = {}

        let tokenId = 0;
        for (let wallet of userWallets) {
            // generate identity and idcomm
            const identity = genIdentity()
            const idComm = genIdentityCommitment(identity)

            // store identity and idcomm
            identities[wallet.address] = identity
            idComms[wallet.address] = idComm

            // Ensure that the current wallet owns this token
            const nftContract = contracts.NFT.connect(wallet)
            expect(await nftContract.ownerOf(tokenId)).toEqual(wallet.address)

            const sig = await signForRegistration(wallet, idComm, tokenId)

            const oouContract = contracts.OneOfUs.connect(relayerWallet)

            // Should fail with an invalid signature
            try {
                const tx = await oouContract.register(
                    idComm.toString(),
                    tokenId,
                    '0x0000',
                    { gasLimit: 900000 }, // setting the gasLimit overrides gas estimation
                )
                const receipt = await tx.wait()
            } catch (e) {
                expect(extractRevertReason(e)).toEqual('OneOfUs: signer does not own this token')
            }

            const balanceBefore = await relayerWallet.provider.getBalance(relayerWallet.address)

            const tx = await oouContract.register(
                idComm.toString(),
                tokenId,
                sig,
                {
                    gasLimit: 1000000,
                }
            )
            const receipt = await tx.wait()
            console.log('Gas used to register an identity:', receipt.gasUsed.toString())
            expect(receipt.status).toEqual(1)

            const balanceAfter = await relayerWallet.provider.getBalance(relayerWallet.address)

            expect(balanceAfter.gte(balanceBefore)).toBeTruthy()

            const relayRegisterReward = await oouContract.relayRegisterReward()
            expect(balanceAfter.toString()).toEqual(
                balanceBefore
                    .sub(receipt.gasUsed.mul(tx.gasPrice))
                    .add(relayRegisterReward)
                    .toString()
            )

            tokenId ++
        }
    })

    test('double registration with the same token id should fail', async () => {
        expect.assertions(1)
        const identity = genIdentity()
        const idComm = genIdentityCommitment(identity)
        const wallet = userWallets[0]
        const oouContract = contracts.OneOfUs.connect(wallet)

        // token ID 0 was already used earlier
        const tokenId = 0

        const sig = await signForRegistration(wallet, idComm, tokenId)

        try {
            const tx = await oouContract.register(
                idComm.toString(),
                tokenId,
                sig,
                { gasLimit: 900000 }, // setting the gasLimit overrides gas estimation
            )
            const receipt = await tx.wait()
        } catch (e) {
            expect(extractRevertReason(e)).toEqual('OneOfUs: token already registered')
        }
    })

    test('registration wits a token from a different event should fail', async () => {
        expect.assertions(1)

        const wallet = userWallets[0]

        const idComm = genIdentityCommitment(genIdentity())

        // mint a token with a different event id
        const tokenId = 2
        const mintTx = await contracts.NFT.mintToken(
            config.chain.poapEventId + 1,
            tokenId,
            wallet.address,
        )
        await mintTx.wait()

        const oouContract = contracts.OneOfUs.connect(wallet)
        const sig = await signForRegistration(wallet, idComm, tokenId)

        try {
            const tx = await oouContract.register(
                idComm.toString(),
                tokenId,
                sig,
                { gasLimit: 900000 }, // setting the gasLimit overrides gas estimation
            )
            const receipt = await tx.wait()
        } catch (e) {
            expect(extractRevertReason(e)).toEqual('OneOfUs: wrong POAP event ID')
        }
    })

    test('posting a question should work', async () => {
        const wallet = userWallets[1]
        const oouContract = contracts.OneOfUs.connect(wallet)

        const tx = await oouContract.postQuestion(
            questionHash,
            {
                value: await oouContract.getPostQuestionFee(),
            }
        )

        const receipt = await tx.wait()
        console.log('Gas used for posting the question:', receipt.gasUsed.toString())

        const semaphoreContract = contracts.Semaphore.connect(wallet)
        expect(await semaphoreContract.hasExternalNullifier(questionHash)).toBeTruthy()
    })

    //test('answering a question should work', async () => {
        //const wallet = userWallets[0]
        //const identity = identities[wallet.address]

        //const oouContract = contracts.OneOfUs.connect(wallet)
        //const leaves = await oouContract.getLeaves()

        //expect(leaves[0].toString()).toEqual(genIdentityCommitment(identity).toString())

        //const semaphoreContract = contracts.Semaphore.connect(wallet)
        //const tree = await genTree(12, leaves)
        //const isInRootHistory = await semaphoreContract.isInRootHistory(await tree.root())

        //const result = await genWitness(
            //answerHash,
            //circuit,
            //identity,
            //leaves,
            //12,
            //BigInt(questionHash),
        //)

        //const witness = result.witness
        //expect(circuit.checkWitness(witness)).toBeTruthy()

        //const proof = await genProof(witness, provingKey)
        //const publicSignals = genPublicSignals(witness, circuit)

        //expect(verifyProof(verifyingKey, proof, publicSignals)).toBeTruthy()

        //const registrationProof = formatForVerifierContract(proof, publicSignals)

        //const balanceBefore = await wallet.provider.getBalance(wallet.address)
        //const tx = await oouContract.answerQuestion(
            //answerHash,
            //registrationProof.a,
            //registrationProof.b,
            //registrationProof.c,
            //registrationProof.input,
        //)
        //const receipt = await tx.wait()
        //expect(receipt.status).toEqual(1)
        //console.log('Gas used for the answer:', receipt.gasUsed.toString())

        //const balanceAfter = await wallet.provider.getBalance(wallet.address)

        //const relayAnswerReward = await oouContract.relayAnswerReward()
        //expect(balanceAfter.toString()).toEqual(
            //balanceBefore
                //.sub(receipt.gasUsed.mul(tx.gasPrice))
                //.add(relayAnswerReward).toString()
        //)


        //const event = receipt.logs[1]
        //const parsedLog = oouContract.interface.parseLog(event)
        //const answerIndex = parsedLog.values[0]

        //const retrievedAnswer = await oouContract.getAnswerByIndex(answerIndex.toString())
        //expect(retrievedAnswer).toEqual(answerHash)
    //})

    test('fee and reward setters', async () => {
        const oouContract = contracts.OneOfUs.connect(adminWallet)

        const newVal = ethers.utils.bigNumberify(1)
        // postQuestionFee
        let originalVal = await oouContract.getPostQuestionFee()
        let tx = await oouContract.setPostQuestionFee(newVal)
        await tx.wait()
        expect(await oouContract.getPostQuestionFee()).toEqual(newVal)
        tx = await oouContract.setPostQuestionFee(originalVal)
        expect(await oouContract.getPostQuestionFee()).toEqual(originalVal)
        await tx.wait()

        // relayRegisterReward
        originalVal = await oouContract.getRelayRegisterReward()
        tx = await oouContract.setRelayRegisterReward(newVal)
        await tx.wait()
        expect(await oouContract.getRelayRegisterReward()).toEqual(newVal)
        tx = await oouContract.setRelayRegisterReward(originalVal)
        expect(await oouContract.getRelayRegisterReward()).toEqual(originalVal)
        await tx.wait()

        // relayAnswerReward
        originalVal = await oouContract.getRelayAnswerReward()
        tx = await oouContract.setRelayAnswerReward(newVal)
        await tx.wait()
        expect(await oouContract.getRelayAnswerReward()).toEqual(newVal)
        tx = await oouContract.setRelayAnswerReward(originalVal)
        expect(await oouContract.getRelayAnswerReward()).toEqual(originalVal)
        await tx.wait()
    })
})
