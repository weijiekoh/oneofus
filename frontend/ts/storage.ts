// The functions in this file handle the storage of identities (keypair,
// identityNullifier, and identityTrapdoor) in the browser's localStorage. The
// identityCommitment is deterministically derived using libsemaphore's
// genIdentityCommitment function, so we don't store it.

const config = require('./exported_config')
import {
    EddsaPrivateKey,
} from 'libsemaphore'

interface IdentityStored {
    identityNullifier: BigInt,
    identityTrapdoor: BigInt,
    privKey: EddsaPrivateKey,
    registerTxHash: string,
}

const localStorage = window.localStorage

// The storage key depends on the mixer contracts to prevent conflicts
const oouPrefix = config.chain.contracts.OneOfUs.slice(2).toLowerCase()
const key = `ONEOFUS_${oouPrefix}`

const initStorage = () => {
    if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]')
    }
}

//const hexifyItem = (item: IdentityStored) => {
    //return Object.assign(
        //item,
        //{
            //identityNullifier: item.identityNullifier.toString(16),
            //identityTrapdoor: item.identityTrapdoor.toString(16),
            //privKey: item.privKey.toString('hex'),
        //}
    //)
//}

//const deHexifyItem = (hexified: any): IdentityStored => {
    //return {
        //...hexified,
        //identityNullifier: BigInt('0x' + hexified.identityNullifier),
        //identityTrapdoor: BigInt('0x' + hexified.identityTrapdoor),
        //privKey: Buffer.from(hexified.privKey, 'hex'),
    //}
//}

//const updateDepositTxStatus = (
    //identity: Identity,
    //depositTxHash: string,
//) => {
    //let items = getRawItems()
    //for (let i=0; i < items.length; i++) {
        //if (items[i].identityNullifier === identity.identityNullifier.toString(16)) {
            //items[i].depositTxHash = depositTxHash
            //break
        //}
    //}
    //saveItems(items)
//}

//const updateWithdrawTxHash = (
    //identity: Identity,
    //withdrawTxHash: string,
//) => {
    //let items = getRawItems()
    //for (let i=0; i < items.length; i++) {
        //if (items[i].identityNullifier === identity.identityNullifier.toString(16)) {
            //items[i].withdrawTxHash = withdrawTxHash
            //break
        //}
    //}
    //saveItems(items)
//}

//const getRawItems = () => {
    //const stored = localStorage.getItem(key)
    //if (!stored) {
        //throw 'Storage not initialised'
    //}
    //return JSON.parse(stored)
//}

//const getItems = () => {
    //return getRawItems().map(deHexifyItem)
//}

//const getNumItems = (): number => {
    //return getRawItems().length
//}

//const saveItems = (items: any[]) => {
    //const data = JSON.stringify(items.map(hexifyItem))
    //localStorage.setItem(key, data)
//}

//const storeDeposit = (
    //identity: Identity,
    //recipientAddress: string,
    //tokenType: string,
    //depositTxHash=null,
//) =>  {
    //const items = getRawItems()
    //items.push({
        //privKey: identity.keypair.privKey,
        //identityNullifier: identity.identityNullifier,
        //identityTrapdoor: identity.identityTrapdoor,
        //depositTxHash,
        //recipientAddress,
        //tokenType,
        //timestamp: (new Date()).getTime(),
        //withdrawTxHash: '',
    //})
    //saveItems(items)
//}

//const getNumUnwithdrawn = (): number => {
    //return getItems().filter((item) => {
        //return item.withdrawTxHash.length === 0
    //}).length
//}

//const getFirstUnwithdrawn = (): IdentityStored => {
    //const items = getItems()
    //for (let item of items) {
        //if (item.withdrawTxHash.length === 0) {
            //return item
        //}
    //}
    //throw new Error('All items withdrawn')
//}

export {
    initStorage,
}
