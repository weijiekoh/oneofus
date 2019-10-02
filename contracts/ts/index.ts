import * as ethers from 'ethers'
import { compileAndDeploy } from './compileAndDeploy'

const signForRegistration = (wallet, idComm, tokenId) => {
    const payload = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256'],
        [idComm, tokenId].map((x) => '0x' + x.toString(16)),
    )
    const hash = ethers.utils.keccak256(payload)

    return wallet.signMessage(ethers.utils.arrayify(hash))
}

const signForPostQn = (wallet, questionHash) => {
    const payload = ethers.utils.defaultAbiCoder.encode(['bytes32'], questionHash)
    const hash = ethers.utils.keccak256(payload)

    return wallet.signMessage(ethers.utils.arrayify(hash))
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


export {
    signForRegistration,
    genQuestionHash,
    cutOrExpandHexToBytes,
    compileAndDeploy,
    signForPostQn,
}
