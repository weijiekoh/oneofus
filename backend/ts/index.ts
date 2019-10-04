require('module-alias/register')
import Ajv from 'ajv'
import Koa from 'koa';
import Knex from 'knex'
import bodyParser from 'koa-bodyparser'

import helmet from 'koa-helmet'

import { config } from 'ao-config'
import { router } from './routes'
import * as JsonRpc from './jsonRpc'

import { Model } from 'objection'
import Question from './models/Question'
import { genError, BackendErrorNames, } from './errors'

//const ajv = new Ajv({ missingRefs: 'ignore' })

const ajv = new Ajv()
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'))
const jsonRpcSchema = require('@ao-backend/schemas/jsonRpc.json')
const basicValidate: Ajv.ValidateFunction = ajv.compile(jsonRpcSchema)

/*
 * Validate the request against the basic JSON-RPC 2.0 schema
 */
const validateJsonRpcSchema = async (
    ctx: Koa.Context,
    next: Function,
) => {

    if (basicValidate(JSON.parse(ctx.request.rawBody))) {
        await next()
    } else {
        ctx.type = 'application/json-rpc'
        ctx.body = JsonRpc.genErrorResponse(
            null,
            JsonRpc.Errors.invalidRequest.code,
            JsonRpc.Errors.invalidRequest.message,
        )
    }
}

/*
 * Middleware to ensure that the request body is valid JSON
 */
const validateJsonParse = async (
    ctx: Koa.Context,
    next: Function,
) => {
    try {
        JSON.parse(ctx.request.rawBody)
        await next()
    } catch (err) {
        ctx.type = 'application/json-rpc'
        ctx.body = JsonRpc.genErrorResponse(
            null,
            JsonRpc.Errors.parseError.code,
            JsonRpc.Errors.parseError.message,
        )
    }
}

/*
 * Middleware to ensure that the HTTP Content-Type is
 * either application/json-rpc, applicaton/json, or application/jsonrequest
 */
const validateHeaders = async (
    ctx: Koa.Context,
    next: Function,
) => {
    const contentType = ctx.request.type
    if (
        contentType === 'application/json' ||
        contentType === 'text/plain'
    ) {
        await next()
    } else {
        ctx.throw(400, 'Invalid content-type')
    }
}

/*
 * Middleware to ensure that the HTTP method is only POST
 */
const validateMethod = async (
    ctx: Koa.Context,
    next: Function,
) => {
    if (ctx.request.method !== 'POST') {
        ctx.throw(405, 'Method not allowed')
    } else {
        await next()
    }
}

/*
 * Returns a Koa app
 */
const createApp = () => {
    const app = new Koa()

    // Set middleware
    app.use(helmet())
    app.use(bodyParser({
        enableTypes: ['json', 'text'],
        disableBodyParser: true,
    }))

    // Validate basic JSON-RPC 2.0 requirements
    app.use(validateMethod)
    app.use(validateHeaders)
    app.use(validateJsonParse)
    app.use(validateJsonRpcSchema)

    // Let the router handle everything else
    app.use(router)

    return app
}

const main = async () => {
    await bindDb()
    const port = config.get('backend.port')
    const app = createApp()
    app.listen(port)

    console.log('Running server on port', port)
}

const bindDb = async () => {
    const connErr = genError(
        BackendErrorNames.BACKEND_DB_NOT_CONNECTED,
        `Could not connect to the DB at ${config.backend.db.connection.host}:${config.backend.db.connection.port}`
    )

    const knex = Knex(config.backend.db)
    Model.knex(knex)

    // Wait for the DB to be active
    const r = await knex.raw('select 1+1 as result')
    if (r.rows[0].result !== 2) { 
        throw connErr 
    }

    return knex
}

if (require.main === module) {
    main()
}

export { createApp, bindDb }
