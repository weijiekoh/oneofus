require('module-alias/register')
import * as ethers from 'ethers'
import { config } from 'ao-config'

const definitions = require('@ao-backend/schemas/definitions.json')
import Ajv from 'ajv'

const genValidator = (
    name: string,
) => {
    const schema = require(`@ao-backend/schemas/${name}.json`)

    const ajv = new Ajv()

    ajv.addSchema(definitions)
    ajv.addSchema(schema)

    const validate: Ajv.ValidateFunction = ajv.compile(schema)

    return validate
}

const getContract = (
    name: string,
    abiName?: string
) => {
    if (!abiName) {
        abiName = name
    }

    const abi = require(`@ao-backend/abi/${abiName}.abi.json`)

    const contract = new ethers.Contract(
        config.chain.contracts[name],
        abi,
        new ethers.providers.JsonRpcProvider(config.chain.url),
    )

    return contract
}

export { genValidator, getContract }
