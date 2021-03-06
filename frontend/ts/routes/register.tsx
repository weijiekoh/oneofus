import React, { useState }  from 'react'
import ReactDOM from 'react-dom'
import { useWeb3Context } from 'web3-react'
import {
    register,
    getTokenIds,
} from '../web3/register'
import {
    genIdentity,
    genIdentityCommitment,
} from 'libsemaphore'
import {
    initStorage,
    storeId,
    hasId,
    retrieveId,
    storeTokenId,
} from '../storage'


enum TxStatuses {
     None, Pending, Mined, Err,
}

const etherscanUrl = (txHash: string) => {
    return 'https://etherscan.io/tx/' + txHash.toString()
}

const RegisterRoute = () => {
    initStorage()

    const context = useWeb3Context()
    const [tokenId, setTokenId] = useState('')
    const [identityJSON, setIdentityJSON] = useState('')
    const [registerTxHash, setRegisterTxHash] = useState('')
    const [registerTxStatus, setRegisterTxStatus] = useState(TxStatuses.None)

    let identity
    if (hasId()){
        identity = retrieveId()
    } else {
        identity = genIdentity()
        storeId(identity)
    }

    // OneOfUs's getTokenIdsByAddress doesn't filter by event ID, so just ask
    // participants to look it up on Etherscan
    //
    //getTokenIds(context).then((tokenIds) => {
        //if (tokenIds && tokenIds.length > 0) {
            //setTokenId(tokenIds[0].toString())
        //}
    //})

    const handleRegisterBtnClick = async () => {
        const identity = retrieveId()
        const identityCommitment = genIdentityCommitment(identity)

        const tx = await register(context, '0x' + identityCommitment.toString(16), tokenId)
        setRegisterTxHash(tx.hash)
        setRegisterTxStatus(TxStatuses.Pending)
        storeTokenId(tokenId)

        const receipt = await tx.wait()

        if (receipt.status === 1) {
            setRegisterTxStatus(TxStatuses.Mined)
        } else {
            setRegisterTxStatus(TxStatuses.Err)
        }
    }

    return (
        <div className='columns'>
            <div className='column is-12-mobile is-8-desktop is-offset-2-desktop'>
                <h2 className='subtitle'>
                    You can register to vote as long as your current Ethereum
                    account owns a Devcon 5 POAP token.
                </h2>

                <div className='column is-full'>
                    <label htmlFor='tokenId'>
                        Your Devcon 5 POAP Token ID:
                    </label>
                </div>

                <div className='column is-full'>
                    <input 
                        onChange={(e) => {
                            setTokenId(e.target.value)
                        }}
                        id='tokenId' 
                        value={tokenId}
                        className="input tokenId_input" 
                        type="text"
                        placeholder="POAP token ID" />
                </div>

                <div className='column is-full'>
                    { registerTxHash.length === 0 &&
                        <button 
                            className='button registerBtn is-success'
                            onClick={handleRegisterBtnClick}
                        >
                            Register
                        </button>
                    }

                    { registerTxStatus === TxStatuses.Pending &&
                        <p>Transaction pending. View it on <a 
                                href={etherscanUrl(registerTxHash)}
                                target='_blank'>Etherscan</a>.
                        </p>
                    }

                    { registerTxStatus === TxStatuses.Mined &&
                        <div>
                            <p>
                                Transaction mined. View it on <a 
                                    href={etherscanUrl(registerTxHash)}
                                    target='_blank'>Etherscan</a>.
                            </p>
                            <p>
                                You may now <a href='/vote'>post questions and vote</a>.
                            </p>
                        </div>
                    }
                </div>
            </div>
        </div>
    )
}

export default RegisterRoute
