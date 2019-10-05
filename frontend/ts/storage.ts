// The functions in this file handle the storage of identities (keypair,
// identityNullifier, and identityTrapdoor) in the browser's localStorage. The
// identityCommitment is deterministically derived using libsemaphore's
// genIdentityCommitment function, so we don't store it.

const config = require('./exported_config')
import {
    serialiseIdentity,
    unSerialiseIdentity,
    Identity,
} from 'libsemaphore'

const localStorage = window.localStorage

// The storage key depends on the mixer contracts to prevent conflicts
const oouPrefix = config.chain.contracts.OneOfUs.slice(2).toLowerCase()
const key = `ONEOFUS_${oouPrefix}`
const tokenIdKey = `POAP_TOKENID_${oouPrefix}`

const initStorage = () => {
    if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '')
    }
}

const storeTokenId = (tokenId: string) => {
    localStorage.setItem(tokenIdKey, tokenId)
}

const retrieveTokenId = () => {
    return localStorage.getItem(tokenIdKey)
}

const storeId = (identity: Identity) => {
    localStorage.setItem(key, serialiseIdentity(identity))
}

const retrieveId = (): Identity => {
    return unSerialiseIdentity(localStorage.getItem(key))
}

const hasId = (): boolean => {
    const d = localStorage.getItem(key)
    return d != null && d.length > 0
}

const hasTokenId = (): boolean => {
    const d = localStorage.getItem(tokenIdKey)
    return d != null && d.length > 0
}

export {
    initStorage,
    storeId,
    retrieveId,
    storeTokenId,
    retrieveTokenId,
    hasId,
    hasTokenId,
}
