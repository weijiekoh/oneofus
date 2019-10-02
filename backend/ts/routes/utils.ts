require('module-alias/register')

const definitions = require('@ao-backend/schemas/definitions.json')
import Ajv from 'ajv'

const genValidator = (
    name: string,
) => {
    const schema = require(`@ao-backend/schemas/${name}.json`)

    const ajv = new Ajv()

    ajv.addSchema(definitions)
    ajv.addSchema(schema)

    //const validate: Ajv.ValidateFunction = ajv.addSchema(definitions).compile(schema)
    const validate: Ajv.ValidateFunction = ajv.compile(schema)

    return validate
}

export { genValidator }
