import * as ethers from 'ethers'
const config = require('../exported_config')

const getQuestionHashes = async (context: any) => {
    const connector = context.connector
    if (connector) {
        const provider = new ethers.providers.Web3Provider(
            await connector.getProvider(config.chain.chainId),
        )

        return await provider.getBalance(context.account)
    }

    return null
}

export { getQuestionHashes }

