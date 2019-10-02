import { VError } from 'verror'

enum BackendErrorNames {
    BACKEND_ECHO_MSG_BLANK = 'BACKEND_ECHO_MSG_BLANK',
}

const errorCodes = {
    BACKEND_ECHO_MSG_BLANK: -32000,
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
