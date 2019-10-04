import { createApp, bindDb } from '../index'
const Koa = require('koa')
import axios from 'axios'
import * as JsonRpc from '../jsonRpc'
import * as fs from 'fs'
import { config } from 'ao-config'
import * as errors from '../errors'
import * as path from 'path'
import * as ethers from 'ethers'
import { post } from './utils'
import {
    compileAndDeploy,
    signForPostQn,
    recoverPostQnSigner,
    genQuestionHash,
    genAnswerHash,
} from 'ao-contracts'
import {
    genTree,
    genIdentity,
    genIdentityCommitment,
    genWitness,
    genCircuit, 
    genProof,
    genPublicSignals,
    verifyProof,
    parseVerifyingKeyJson,
    stringifyBigInts,
    unstringifyBigInts,
} from 'libsemaphore'

jest.setTimeout(90000)

const PORT = config.get('backend.port')
const HOST = config.get('backend.host') + ':' + PORT.toString()

const OPTS = {
    headers: {
        'Content-Type': 'application/json',
    }
}

const userWallets: ethers.Wallet[] = []
let adminWallet
let identities = {}
let contracts
let server

const circuitPath = path.join(
    __dirname,
    '../../../semaphore/semaphorejs/build/circuit.json',
)

const cirDef = JSON.parse(fs.readFileSync(circuitPath).toString())
const circuit = genCircuit(cirDef)

const provingKeyPath = path.join(
    __dirname,
    '../../../semaphore/semaphorejs/build/proving_key.bin',
) 
const provingKey = fs.readFileSync(provingKeyPath)

const verifyingKeyPath = path.join(
    __dirname,
    '../../../semaphore/semaphorejs/build/verification_key.json',
) 
const verifyingKey = parseVerifyingKeyJson(fs.readFileSync(verifyingKeyPath).toString())

describe('Backend API', () => {
    beforeAll(async () => {
        await bindDb()
        const app = createApp()
        server = app.listen(PORT)
        contracts = await compileAndDeploy(
            path.resolve('../contracts/abi'),
            path.resolve('../contracts/sol'),
            config.solcBinaryPath,
            config.chain.url,
            config.chain.keys.deploy,
        )

        for (let sk of config.backend.test.keys) {
            const wallet = new ethers.Wallet(sk, contracts.NFT.provider)
            userWallets.push(wallet)

            identities[wallet.address] = genIdentity()
        }

        adminWallet = new ethers.Wallet(config.chain.keys.deploy)
        // give away ETH
        const amountEth = '1'
        for (let wallet of userWallets) {
            const address = wallet.address
            const provider = contracts.NFT.provider
            const tx = await provider.sendTransaction(
                adminWallet.sign({
                    nonce: await provider.getTransactionCount(adminWallet.address),
                    gasPrice: 1,
                    gasLimit: 21000,
                    to: address,
                    value: ethers.utils.parseEther(amountEth),
                    data: '0x'
                })
            )
            await tx.wait()
            const balance = await provider.getBalance(address)
            expect(balance.gte(ethers.utils.parseEther(amountEth))).toBeTruthy()
        }

        // mint and register tokens
        const nftContract = await contracts.NFT.connect(adminWallet)
        let tokenId = 0
        for (let wallet of userWallets) {
            let tx = await contracts.NFT.mintToken(
                config.chain.poapEventId,
                tokenId,
                wallet.address,
            )
            await tx.wait()

            const oouContract = await contracts.OneOfUs.connect(wallet)
            const idComm = genIdentityCommitment(identities[wallet.address])
            tx = await oouContract.register('0x' + idComm.toString(16), tokenId)
            await tx.wait()
            console.log('registered token', tokenId, 'with', wallet.address)

            tokenId ++
        }
    })

    describe('oou_post_qn', () => {
        test('works with a unique question and registered token', async () => {
            const question = Date.now().toString()
            const questionHash = genQuestionHash(question)

            const tokenId = 0

            // sign
            const sig = await signForPostQn(
                userWallets[0],
                questionHash,
                tokenId,
            )

            // verify the sig
            const signerAddress = recoverPostQnSigner(
                sig,
                questionHash,
                tokenId,
            )

            expect(signerAddress).toEqual(userWallets[0].address)

            const resp = await post(
                1,
                'oou_post_qn',
                {
                    question,
                    tokenId,
                    sig
                },
            )

            expect(resp.data.result.questionHash).toEqual(questionHash)
            expect(resp.data.result.sig).toEqual(sig)
        })

        test('fails with an unregistered token', async () => {
            const question = Date.now().toString()
            const questionHash = genQuestionHash(question)

            const tokenId = 9999

            // sign
            const sig = await signForPostQn(
                userWallets[0],
                questionHash,
                tokenId,
            )

            const resp = await post(
                2,
                'oou_post_qn',
                {
                    question,
                    tokenId,
                    sig
                },
            )
            expect(resp.data.error.data.name).toEqual(
                errors.BackendErrorNames.BACKEND_POST_QN_ADDRESS_UNREGISTERED,
            )
        })
    })

    describe('oou_list_qns', () => {
        test('returns a list of questions posted so far', async () => {
            const resp = await post(
                3,
                'oou_list_qns',
                { },
            )

            expect(resp.data.result.length > 0).toBeTruthy()
            expect(resp.data.result[0]).toHaveProperty('id')
            expect(resp.data.result[0]).toHaveProperty('question')
            expect(resp.data.result[0]).toHaveProperty('hash')
            expect(resp.data.result[0]).toHaveProperty('sig')
            expect(resp.data.result[0]).toHaveProperty('createdAt')
        })
    })

    describe('oou_post_answer', () => {
        let answerData

        test('should post a valid answer successfully', async () => {
            const wallet = userWallets[0]
            const identity = identities[wallet.address]
            const oouContract = await contracts.OneOfUs.connect(wallet)
            const question = 'test question ' + Date.now().toString()
            const questionHash = genQuestionHash(question)

            const tokenId = 0

            const sig = await signForPostQn(userWallets[0], questionHash, tokenId)

            // verify the sig
            const signerAddress = recoverPostQnSigner(
                sig,
                questionHash,
                tokenId,
            )

            expect(signerAddress).toEqual(userWallets[0].address)

            let resp = await post(
                4,
                'oou_post_qn',
                {
                    question,
                    tokenId,
                    sig
                },
            )

            expect(resp.data.result.questionHash).toEqual(questionHash)

            const answer = 'test answer ' + Date.now().toString()
            const answerHash = genAnswerHash(answer)
            const leaves = await oouContract.getLeaves()
            const tree = await genTree(config.chain.semaphoreTreeDepth, leaves)
            const result = await genWitness(
                answerHash,
                circuit,
                identity,
                leaves,
                config.chain.semaphoreTreeDepth,
                BigInt(questionHash),
            )

            const witness = result.witness
            expect(circuit.checkWitness(witness)).toBeTruthy()
            const proof = await genProof(witness, provingKey)
            const publicSignals = genPublicSignals(witness, circuit)

            expect(verifyProof(verifyingKey, proof, publicSignals)).toBeTruthy()
            answerData = {
                questionHash,
                answer,
                proof: JSON.stringify(stringifyBigInts(proof)),
                publicSignals: JSON.stringify(stringifyBigInts(publicSignals)),
            }

            resp = await post(
                5,
                'oou_post_ans',
                answerData,
            )

            expect(resp.data.result.answerHash).toEqual(answerHash)
        })

        test('should post a valid answer successfully', async () => {
            // posting the same data should fail
            const resp = await post(
                6,
                'oou_post_ans',
                answerData,
            )

            expect(resp.data.error.data.name).toEqual(
                errors.BackendErrorNames.BACKEND_POST_ANSWER_EXISTS,
            )
        })
    })

    describe('oou_list_answers', () => {
        test('returns a list of answers posted so far', async () => {
            const resp = await post(
                7,
                'oou_list_ans',
                { },
            )

            expect(resp.data.result.length > 0).toBeTruthy()
            expect(resp.data.result[0]).toHaveProperty('id')
            expect(resp.data.result[0]).toHaveProperty('questionId')
            expect(resp.data.result[0]).toHaveProperty('answer')
            expect(resp.data.result[0]).toHaveProperty('hash')
            expect(resp.data.result[0]).toHaveProperty('publicSignals')
            expect(resp.data.result[0]).toHaveProperty('nullifierHash')
            expect(resp.data.result[0]).toHaveProperty('createdAt')

            const extractedNh = '0x' + unstringifyBigInts(JSON.parse(resp.data.result[0].publicSignals)[1]).toString(16)
            expect(extractedNh).toEqual(resp.data.result[0].nullifierHash)
        })
    })

    afterAll(async () => {
        server.close()
    })
})
