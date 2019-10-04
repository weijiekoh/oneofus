require('module-alias/register')
import * as ethers from 'ethers'
import * as fs from 'fs'
import * as path from 'path'
import * as errors from '../errors'
import {
    genQuestionHash,
    genAnswerHash,
    recoverPostQnSigner,
} from 'ao-contracts'
import { genValidator } from './utils'
import Question from '../models/Question'
import Answer from '../models/Answer'
import { getContract } from './utils'
import {
    unstringifyBigInts,
    parseVerifyingKeyJson,
    verifyProof,
} from 'libsemaphore'

const verifyingKeyPath = path.join(
    __dirname,
    '../../snarks/verification_key.json',
) 

const verifyingKey = parseVerifyingKeyJson(fs.readFileSync(verifyingKeyPath).toString())

const postAns = async ({ questionHash, answer, proof, publicSignals }) => {
    // check whether the questionHash exists in the DB
    const qns = await Question.query()
        .findOne('hash', '=', questionHash)

    if (!qns) {
        const errorMsg = 'This question does not exist'
        throw {
            code: errors.errorCodes.BACKEND_POST_ANSWER_NO_SUCH_QN,
            message: errorMsg,
            data: errors.genError(
                errors.BackendErrorNames.BACKEND_POST_ANSWER_NO_SUCH_QN,
                errorMsg,
            )
        }
    }

    const answerHash = genAnswerHash(answer)
    const nullifierHash = '0x' + unstringifyBigInts(JSON.parse(publicSignals)[1]).toString(16)

    // check whether the nullifier hash already exists
    const ans = await Answer.query()
        .where('nullifierHash', nullifierHash)
    
    if (ans.length > 0) {
        const errorMsg = 'This answer already exists'
        throw {
            code: errors.errorCodes.BACKEND_POST_ANSWER_EXISTS,
            message: errorMsg,
            data: errors.genError(
                errors.BackendErrorNames.BACKEND_POST_ANSWER_EXISTS,
                errorMsg,
            )
        }
    }

    // verify the proof
    const oouContract = getContract('OneOfUs')
    const parsedProof = unstringifyBigInts(JSON.parse(proof))

    const isValid = verifyProof(
        verifyingKey,
        unstringifyBigInts(JSON.parse(proof)),
        unstringifyBigInts(JSON.parse(publicSignals)),
    )
    if (!isValid) {
        const errorMsg = 'Invalid proof'
        throw {
            code: errors.errorCodes.BACKEND_POST_ANSWER_INVALID_PROOF,
            message: errorMsg,
            data: errors.genError(
                errors.BackendErrorNames.BACKEND_POST_ANSWER_INVALID_PROOF,
                errorMsg,
            )
        }
    }

    // store the answer
    await Answer.query()
        .insert({
            // @ts-ignore
            answer,
            // @ts-ignore
            questionId: qns.id,
            hash: answerHash,
            nullifierHash,
            proof,
            publicSignals,
            createdAt: new Date()
        })

    return {
        answerHash,
    }
}

const postAnsRoute = {
    route: postAns,
    reqValidator: genValidator('postAns'),
}

export default postAnsRoute
