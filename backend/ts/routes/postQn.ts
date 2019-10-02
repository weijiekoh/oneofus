import * as ethers from 'ethers'
import * as errors from '../errors'
import * as contracts from 'ao-contracts'
import { genValidator } from './utils'
import * as ethJsUtil from 'ethereumjs-util'

const postQn = async ({ question, sig }) => {
    debugger
    const questionHash = contracts.genQuestionHash(question)
    const signerAddress = ethers.utils.recoverAddress(questionHash, sig)
    console.log(signerAddress)
    debugger
    return {
        question, sig
    }
    //if (message !== '') {
        //return { message }
    //} else {
        //const errorMsg = 'the message param cannot be blank'
        //throw {
            //code: errors.errorCodes.BACKEND_ECHO_MSG_BLANK,
            //message: errorMsg,
            //data: errors.genError(
                //errors.BackendErrorNames.BACKEND_ECHO_MSG_BLANK,
                //errorMsg,
            //)
        //}
    //}
}

const postQnRoute = {
    route: postQn,
    reqValidator: genValidator('postQn'),
}

export default postQnRoute
