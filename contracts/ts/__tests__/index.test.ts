import { config } from 'ao-config'
import * as path from 'path'
import * as ethers from 'ethers'
import { compileAndDeploy } from '../compileAndDeploy'
const libsemaphore = require('libsemaphore')

jest.setTimeout(30000)
let adminWallet

const userWallets: ethers.Wallet[] = []
const privateKeys = [
    '0x1111111111111111111111111111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222222222222222222222222222',
]

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

        // give away ETH
        for (let wallet of userWallets) {
            const address = wallet.address
            const amountEth = '1'
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
    })

    test ('deploy contracts', async () => {
        expect(contracts.OneOfUs.address).toHaveLength(42)
        expect(contracts.Semaphore.address).toHaveLength(42)
        expect(contracts.NFT.address).toHaveLength(42)
    })

    test ('mint tokens', async () => {
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

    test ('register identities', async () => {
        const idComms = {}

        let tokenId = 0;
        for (let wallet of userWallets) {
            const identity = libsemaphore.genIdentity()
            const idComm = libsemaphore.genIdentityCommitment(identity)
            identities[wallet.address] = identity
            idComms[wallet.address] = idComm

            const oouContract = contracts.OneOfUs.connect(wallet)
            const tx = await oouContract.register(
                idComm.toString(),
                tokenId,
            )
            const receipt = await tx.wait()
            expect(receipt.status).toEqual(1)

            tokenId ++
        }
    })

    test ('double registration with the same token id should fail', async () => {
        expect.assertions(1)
        const identity = libsemaphore.genIdentity()
        const idComm = libsemaphore.genIdentityCommitment(identity)
        const wallet = userWallets[0]
        const oouContract = contracts.OneOfUs.connect(wallet)

        // token ID 0 was already used earlier
        const tokenId = 0
        try {
            const tx = await oouContract.register(
                idComm.toString(),
                tokenId,
                { gasLimit: 900000 }, // setting the gasLimit overrides gas estimation
            )
            const receipt = await tx.wait()
        } catch (e) {
            expect(extractRevertReason(e)).toEqual('OneOfUs: token ID already registered')
        }
    })

    test ('registration with a token from a different event should fail', async () => {
        expect.assertions(1)

        const wallet = userWallets[0]

        //const identity = libsemaphore.genIdentity()
        const idComm = libsemaphore.genIdentityCommitment(libsemaphore.genIdentity())

        // mint a token with a different event id
        const tokenId = 2
        const mintTx = await contracts.NFT.mintToken(
            config.chain.poapEventId + 1,
            tokenId,
            wallet.address,
        )
        await mintTx.wait()

        const oouContract = contracts.OneOfUs.connect(wallet)

        try {
            const tx = await oouContract.register(
                idComm.toString(),
                tokenId,
                { gasLimit: 900000 }, // setting the gasLimit overrides gas estimation
            )
            const receipt = await tx.wait()
        } catch (e) {
            expect(extractRevertReason(e)).toEqual('OneOfUs: wrong POAP event ID')
        }
    })
})

const extractRevertReason = (e: any) => {
    return e.data[e.transactionHash].reason
}
