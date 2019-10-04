import { VError } from 'verror'

enum BackendErrorNames {
    BACKEND_DB_NOT_CONNECTED = 'BACKEND_DB_NOT_CONNECTED',
    BACKEND_ECHO_MSG_BLANK = 'BACKEND_ECHO_MSG_BLANK',
    BACKEND_POST_QN_EXISTS = 'BACKEND_POST_QN_EXISTS',
    BACKEND_POST_QN_ADDRESS_UNREGISTERED = 'BACKEND_POST_QN_ADDRESS_UNREGISTERED',
    BACKEND_POST_ANSWER_NO_SUCH_QN = 'BACKEND_POST_ANSWER_NO_SUCH_QN',
    BACKEND_POST_ANSWER_INVALID_PROOF = 'BACKEND_POST_ANSWER_INVALID_PROOF',
    BACKEND_POST_ANSWER_EXISTS = 'BACKEND_POST_ANSWER_EXISTS',
}

const errorCodes = {
    BACKEND_DB_NOT_CONNECTED: -32000,
    BACKEND_ECHO_MSG_BLANK: -32001,
    BACKEND_POST_QN_EXISTS: -32002,
    BACKEND_POST_QN_ADDRESS_UNREGISTERED: -32003,

    BACKEND_POST_ANSWER_INVALID_PROOF: -32010,
    BACKEND_POST_ANSWER_NO_SUCH_QN: -32011,
    BACKEND_POST_ANSWER_EXISTS: -32012
}

interface BackendError {
    name: BackendErrorNames,
    message: string
    cause?: any
}

/*
 * Convenience function to create and return a VError
 */
const genError = (
    name: BackendErrorNames,
    message: string,
    cause?: any,
) => {

    return new VError({
        name,
        message,
        cause
    })
}

export {
    BackendErrorNames,
    BackendError,
    genError,
    errorCodes,
}
