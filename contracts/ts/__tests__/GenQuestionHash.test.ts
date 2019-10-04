import * as ethers from 'ethers'
import { genQuestionHash, cutOrExpandHexToBytes } from '../index'

describe('Helper functions for generating a 29-byte quesiton hash', () => {
    test('cutOrExpandHexToBytes() should always return a 29-byte hex string', () => {
        const input0 = '0x'
        const output0 = cutOrExpandHexToBytes(input0, 29)
        expect(output0).toHaveLength(60)
        expect(output0.startsWith('0x')).toBeTruthy()
        expect(output0).toEqual('0x0000000000000000000000000000000000000000000000000000000000')

        const input1 = '0xcaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa9dddd'
        const output1 = cutOrExpandHexToBytes(input1, 29)
        expect(output1).toHaveLength(60)
        expect(output1.startsWith('0x')).toBeTruthy()
        expect(output1).toEqual('0xcaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa9')

        const input2 = '0x1aa1'
        const output2 = cutOrExpandHexToBytes(input2, 29)
        expect(output2).toHaveLength(60)
        expect(output2.startsWith('0x')).toBeTruthy()
        expect(output2).toEqual('0x0000000000000000000000000000000000000000000000000000001aa1')

        const input3 = '0x8888888888888888888888888888888888888888888888888888888888888888'
        const output3 = cutOrExpandHexToBytes(cutOrExpandHexToBytes(input3, 29), 32)
        expect(output3).toEqual('0x0000008888888888888888888888888888888888888888888888888888888888')
    })

    test('genQuestionHash() should always return a 32-byte hex string whose true size is 29 bytes', () => {
        const question = 'test question'
        const fullHash = ethers.utils.solidityKeccak256(['string'], [question])
        const hash = genQuestionHash(question)

        expect(fullHash)
            .toEqual('0x51480a3453be7db7a786adbfc5d579a36a620c26f5a2e51d4c296d52892e38d6')
        expect(hash)
            .toEqual('0x0000003453be7db7a786adbfc5d579a36a620c26f5a2e51d4c296d52892e38d6')
        expect(hash).toHaveLength(66)
    })
})

