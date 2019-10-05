import * as ethers from 'ethers'
const config = require('../exported_config')

const oouAbi = require('../../abi/OneOfUs.abi.json')

const getOouContract = async (context) => {
    const provider = new ethers.providers.Web3Provider(
        await context.connector.getProvider(config.chain.chainId),
    )
    const signer = provider.getSigner()

    return new ethers.Contract(
        config.chain.contracts.OneOfUs,
        oouAbi,
        signer,
    )
}
export {
    getOouContract,
}
