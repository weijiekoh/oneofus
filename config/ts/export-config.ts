import { config } from './index'

if (require.main === module) {
    let c = JSON.parse(JSON.stringify(config))
    if (c.chain.keys) {
        delete c.chain.keys
    }
    console.log(JSON.stringify(c))
}
