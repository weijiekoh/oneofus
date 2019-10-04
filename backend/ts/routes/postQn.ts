require('module-alias/register')
import * as fs from 'fs'
import * as path from 'path'
import * as errors from '../errors'
import { genQuestionHash, recoverPostQnSigner } from 'ao-contracts'
import { genValidator } from './utils'
import Question from '../models/Question'
import { getContract } from './utils'


const postQn = async ({ question, tokenId, sig }) => {
    const oouContract = getContract('OneOfUs')
    const questionHash = genQuestionHash(question)

    const signerAddress = recoverPostQnSigner(
        sig,
        questionHash,
        tokenId.toString(),
    )

    // Check whether the question hash already exists in the DB
    const qns = await Question.query()
        .findOne('hash', '=', questionHash)

    if (qns) {
        // If so, reply with an error
        const errorMsg = 'This question already exists'
        throw {
            code: errors.errorCodes.BACKEND_POST_QN_EXISTS,
            message: errorMsg,
            data: errors.genError(
                errors.BackendErrorNames.BACKEND_POST_QN_EXISTS,
                errorMsg,
            )
        }
    }

    // Check whether the user's POAP token has been registered on-chain
    const isRegistered = await oouContract.isRegistered(signerAddress, tokenId.toString())
    if (!isRegistered) {
        const errorMsg = 'This token hasn not been registered'
        throw {
            code: errors.errorCodes.BACKEND_POST_QN_ADDRESS_UNREGISTERED,
            message: errorMsg,
            data: errors.genError(
                errors.BackendErrorNames.BACKEND_POST_QN_ADDRESS_UNREGISTERED,
                errorMsg,
            )
        }
    }

    // Store the question hash in the db
    await Question.query()
        .insert({
            // @ts-ignore
            question,
            hash: questionHash,
            sig,
            createdAt: new Date(),
        })

    return { questionHash, sig }
}

const postQnRoute = {
    route: postQn,
    reqValidator: genValidator('postQn'),
}

export default postQnRoute
