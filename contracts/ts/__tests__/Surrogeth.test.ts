import { config } from 'ao-config'
import * as path from 'path'
import * as ethers from 'ethers'
import * as fs from 'fs'
import { compileAndDeploy } from '../compileAndDeploy'

jest.setTimeout(30000)

let relayerWallet
let adminWallet

describe('interact with OneOfUs via surrogeth', () => {
    let contracts
    beforeAll(async () => {
        contracts = await compileAndDeploy(
            path.resolve('./abi'),
            path.resolve('./sol'),
            config.solcBinaryPath,
            config.chain.url,
            config.chain.keys.deploy,
        )

        adminWallet = new ethers.Wallet(config.chain.keys.deployer, contracts.NFT.provider)
        relayerWallet = new ethers.Wallet(config.chain.keys.relayer, contracts.NFT.provider)

        // fund the relayerWallet
        const tx = await adminWallet.provider.sendTransaction(
            adminWallet.sign({
                nonce: await adminWallet.provider.getTransactionCount(adminWallet.address),
                gasPrice: 1,
                gasLimit: 21000,
                to: relayerWallet.address,
                value: ethers.utils.parseEther('1'),
                data: '0x'
            })
        )
        await tx.wait()

    })
})
