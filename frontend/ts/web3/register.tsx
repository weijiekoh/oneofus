import * as ethers from 'ethers'
const config = require('../exported_config')

const oouAbi = require('../../abi/OneOfUs.abi.json')
import { getOouContract } from './contracts'

/*
 * Perform a web3 transaction to register a token
 * @param context The web3-react context
 * @param identityCommitment A hex string of the user's identity commitment
 * @param tokenId The tokenId
 */
const register = async (
    context: any,
    identityCommitment: string,
    tokenId: string,
) => {

    const library = context.library
    const connector = context.connector
    if (library && connector) {
        const provider = new ethers.providers.Web3Provider(
            await connector.getProvider(config.chain.chainId),
        )
        const signer = provider.getSigner()

        const oouContract = await getOouContract(context)

        return await oouContract.register(identityCommitment, tokenId, { gasLimit: 900000})
    }
}

/*
 * Perform a web3 transaction to register a token
 * @param context The web3-react context
 * @param identityCommitment A hex string of the user's identity commitment
 * @param tokenId The tokenId
 */
const getTokenIds = async (
    context: any,
) => {
    const library = context.library
    const connector = context.connector
    if (library && connector) {
        const provider = new ethers.providers.Web3Provider(
            await connector.getProvider(config.chain.chainId),
        )
        const signer = provider.getSigner()

        const oouContract = await getOouContract(context)
        const tokenIds = await oouContract.getTokenIdsByAddress(signer.getAddress())
        return tokenIds
    }
}


export {
    register,
    getTokenIds,
}
