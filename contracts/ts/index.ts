require('module-alias/register')
import { config } from 'ao-config'
import * as ethers from 'ethers'
import * as fs from 'fs'
import { compileAndDeploy } from './compileAndDeploy'

//const signForRegistration = (wallet, idComm, tokenId) => {
    //const payload = ethers.utils.defaultAbiCoder.encode(
        //['uint256', 'uint256'],
        //[idComm, tokenId].map((x) => '0x' + x.toString(16)),
    //)

    //// hash the payload. output is 32 bytes
    //const hash = ethers.utils.keccak256(payload)

    //return wallet.signMessage(ethers.utils.arrayify(hash))
//}

const signForPostQn = (
    wallet: ethers.Wallet,
    questionHash: string,
    tokenId: number,
): Promise<string> => {
    const payload = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256'],
        [questionHash, tokenId],
    )

    return wallet.signMessage(
        ethers.utils.arrayify(payload),
    )
}

const recoverPostQnSigner = (
    sig: string,
    questionHash: string,
    tokenId: number,
): string => {
    const payload = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256'],
        [questionHash, tokenId],
    )
    
    return ethers.utils.verifyMessage(
        ethers.utils.arrayify(payload),
        sig,
    )
}

const cutOrExpandHexToBytes = (hexStr: string, bytes: number): string => {
    const len = bytes * 2

    const h = hexStr.slice(2, len + 2)
    return '0x' + h.padStart(len, '0')
}

const genQuestionHash = (question: string): string => {
    const hashed = ethers.utils.solidityKeccak256(['string'], [question])
    return cutOrExpandHexToBytes(
        '0x' + hashed.slice(8),
        32,
    )
}

const getProvider = () => {
    return new ethers.providers.JsonRpcProvider(config.chain.url)
}

const genAnswerHash = (answer: string) => {

    return ethers.utils.solidityKeccak256(['string'], [answer])
}

export {
    //signForRegistration,
    genQuestionHash,
    genAnswerHash,
    cutOrExpandHexToBytes,
    compileAndDeploy,
    signForPostQn,
    recoverPostQnSigner,
    getProvider,
}
