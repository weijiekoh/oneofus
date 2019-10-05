import { config } from 'ao-config'
import * as ethers from 'ethers'
import { compileAndDeploy } from './compileAndDeploy'

const getProvider = () => {
    return new ethers.providers.JsonRpcProvider(config.chain.url)
}

export {
    compileAndDeploy,
    getProvider,
}
