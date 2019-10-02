import { config } from 'ao-config'
import * as path from 'path'
import * as ethers from 'ethers'
import * as fs from 'fs'
import { compileAndDeploy } from '../compileAndDeploy'
import axios from 'axios'
import {
    genIdentity,
    genIdentityCommitment,
} from 'libsemaphore'
import { signForRegistration } from '../index'

jest.setTimeout(60000)

const SURROGETH_URL = config.surrogeth.url
let relayerWalletAddress = config.surrogeth.relayerWalletAddress
let adminWallet
const userWallets: ethers.Wallet[] = []
const privateKeys = [
    '0x1111111111111111111111111111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222222222222222222222222222',
]

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

        adminWallet = new ethers.Wallet(config.chain.keys.deploy, contracts.NFT.provider)

        // fund the relayerWallet
        const tx = await adminWallet.provider.sendTransaction(
            adminWallet.sign({
                nonce: await adminWallet.provider.getTransactionCount(adminWallet.address),
                gasPrice: 1,
                gasLimit: 21000,
                to: relayerWalletAddress,
                value: ethers.utils.parseEther('1'),
                data: '0x'
            })
        )
        await tx.wait()

        for (let sk of privateKeys) {
            userWallets.push(
                new ethers.Wallet(sk, contracts.NFT.provider)
            )
        }

        // fund the OOU contract
        const oouContract = contracts.OneOfUs.connect(adminWallet)
        const fundTx = await adminWallet.provider.sendTransaction(
            adminWallet.sign({
                nonce: await adminWallet.provider.getTransactionCount(adminWallet.address),
                gasPrice: 1,
                gasLimit: 21040,
                to: oouContract.address,
                value: ethers.utils.parseEther('10'),
            })
        )
        await fundTx.wait()
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

    test('surrogeth is up and has the correct relayer wallet', async () => {
        const response = await axios.get(SURROGETH_URL + '/address')
        expect(response.data.address).toEqual(relayerWalletAddress)
    })

    test('the forwarder contract knows about the reputation contract', async () => {
        const rfContract = contracts.RelayerForwarder.connect(adminWallet)
        const rrContract = contracts.RelayerReputation.connect(adminWallet)
        expect(await rfContract.reputation()).toEqual(rrContract.address)
    })

    test('relayed registration works', async () => {
        const oouContract = contracts.OneOfUs.connect(adminWallet)
        const rfContract = contracts.RelayerForwarder.connect(adminWallet)
        const rrContract = contracts.RelayerReputation.connect(adminWallet)

        const amtBurntBefore = await rrContract.relayerToBurn(relayerWalletAddress)
        const relayCountBefore = await rrContract.relayerToRelayCount(relayerWalletAddress)

        const identity = genIdentity()
        const idComm = genIdentityCommitment(identity)

        const tokenId = 0
        const sig = await signForRegistration(userWallets[0], idComm, tokenId)

        const oouRegisterCalldata = oouContract.interface.functions.register.encode([
            idComm.toString(),
            tokenId,
            sig,
        ])

        const rfCallData = rfContract.interface.functions.relayCall.encode([
            oouContract.address,
            oouRegisterCalldata,
        ])

        const response = await axios.post(
            SURROGETH_URL + '/submit_tx',
            {
                to: config.chain.contracts.RelayerForwarder,
                data: rfCallData,
                value: 0,
                network: 'LOCAL',
            }
        )
        await delay(2000)

        expect(response.data.txHash.startsWith('0x')).toBeTruthy()
        expect(response.data.txHash).toHaveLength(66)

        const amtBurntAfter = await rrContract.relayerToBurn(relayerWalletAddress)
        const relayCountAfter = await rrContract.relayerToRelayCount(relayerWalletAddress)

        expect(amtBurntAfter.gt(amtBurntBefore)).toBeTruthy()
        expect(relayCountAfter.gt(relayCountBefore)).toBeTruthy()

        expect(await oouContract.isTokenIdRegistered(tokenId)).toBeTruthy()
    })
})

const delay = (ms: number): Promise<void> => {
    return new Promise((resolve: Function) => setTimeout(resolve, ms))
}
