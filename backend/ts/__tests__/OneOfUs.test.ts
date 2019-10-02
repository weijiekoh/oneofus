import { createApp } from '../index'
const Koa = require('koa')
import axios from 'axios'
import * as JsonRpc from '../jsonRpc'
import { config } from 'ao-config'
import * as errors from '../errors'
import * as path from 'path'
import * as ethers from 'ethers'
import { post } from './utils'
import {
    compileAndDeploy,
    signForPostQn,
    genQuestionHash,
} from 'ao-contracts'

const PORT = config.get('backend.port')
const HOST = config.get('backend.host') + ':' + PORT.toString()

const OPTS = {
    headers: {
        'Content-Type': 'application/json',
    }
}

const userWallets: ethers.Wallet[] = []
let contracts
let server

describe('Backend API', () => {
    beforeAll(async () => {
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
            userWallets.push(
                new ethers.Wallet(sk, contracts.NFT.provider)
            )
        }
    })

    test('handles the oou_post_qn method', async () => {
        const question = 'test question'
        const questionHash = genQuestionHash(question)
        const sig = signForPostQn(userWallets[0], questionHash)

        const resp = await post(
            1,
            'oou_post_qn',
            {
                question,
                sig
            },
        )
        console.log(resp.data)

        //expect(resp.status).toEqual(200)
        //expect(resp.data.result.message).toEqual(message)
    })

    afterAll(async () => {
        server.close()
    })
})
