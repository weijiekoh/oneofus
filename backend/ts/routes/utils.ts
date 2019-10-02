require('module-alias/register')

import Ajv from 'ajv'

const genValidator = (
    name: string,
) => {
    const ajv = new Ajv()
    const schema = require(`@ao-backend/schemas/${name}.json`)
    const validate: Ajv.ValidateFunction = ajv.compile(schema)

    return validate
}

export { genValidator }
