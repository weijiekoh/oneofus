import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { useWeb3Context } from 'web3-react'
const config = require('../exported_config')
import { Redirect } from 'react-router-dom'
import {
    listQns,
    listAnsToQn,
    postQn,
    postAns,
    fetchWithoutCache,
} from '../utils/fetch'
import {
    retrieveTokenId,
    retrieveId,
    hasId,
    hasTokenId,
} from '../storage'
import * as ethers from 'ethers'
import {
    genQuestionHash,
    recoverPostQnSigner,
    genAnswerHash,
} from 'ao-utils'
import {
    getLeaves,
} from '../web3/vote'
import {
    genTree,
    genIdentity,
    genWitness,
    genCircuit,
    genProof,
    genPublicSignals,
    stringifyBigInts,
} from 'libsemaphore'

const VoteRoute = () => {
    const context = useWeb3Context()
    // the list of all questions fetched from the API
    const [qns, setQns] = useState([])
    const [hideVoteBtns, setHideVoteBtns] = useState({})
    const [currentStatus, setCurrentStatus] = useState('')
    const [askedQn, setAskedQn] = useState('')
    const [postQnSuccess, setPostQnSuccess] = useState(false)
    // whether we have fetched questions at least once
    const [fetchedQns, setFetchedQns] = useState(false)
    const [answers, setAnswers] = useState({})

    let identity
    let tokenId
    if (hasId()) {
        identity = retrieveId()
    } else {
        return <Redirect to='/register' />
    }

    if (hasTokenId()) {
        tokenId = retrieveTokenId()
    } else {
        return <Redirect to='/register' />
    }

    if (!fetchedQns) {
        listQns().then(setQns)
        setFetchedQns(true)
    }

    const handleAskBtnClick = () => {
        // @ts-ignore
        const web3 = window.web3
        const from = web3.eth.accounts[0]

        const questionHash = genQuestionHash(askedQn)
        if (tokenId === null) {
            console.error('Token ID not found in localStorage')
            return
        }
        const payload = ethers.utils.defaultAbiCoder.encode(
            ['uint256', 'uint256'],
            [questionHash, tokenId],
        )

        const hash = ethers.utils.keccak256(payload)

        web3.currentProvider.sendAsync({
            method: 'personal_sign',
            params: [hash, from],
            from
        }, (err, response) => {
            if (err) {
                console.error(err)
                return
            }

            postQn(askedQn, parseInt(tokenId, 10), response.result).then((result) => {
                setAskedQn('')
                setPostQnSuccess(true)
                console.log(result)
                listQns().then(setQns)
            })
        })
    }

    const handleYesNoBtnClick = async (qn, answer) => {
        setPostQnSuccess(false)
        setCurrentStatus('Downloading circuit')
        console.log('Downloading circuit')
        const cirDef = await (await fetchWithoutCache(config.snarkUrls.circuit)).json() 
        const circuit = genCircuit(cirDef)

        const answerHash = genAnswerHash(answer)
        const leaves = await getLeaves(context)
        const tree = await genTree(config.chain.semaphoreTreeDepth, leaves)

        console.log('Generating witness')
        setCurrentStatus('Generating witness')
        const result = await genWitness(
            answerHash,
            circuit,
            identity,
            leaves,
            config.chain.semaphoreTreeDepth,
            BigInt(qn.hash),
        )

        const witness = result.witness
        console.log(circuit.checkWitness(witness))

        console.log('Downloading proving key')
        setCurrentStatus('Downloading proving key')
        const provingKey = new Uint8Array(
            await (await fetch(config.snarkUrls.provingKey)).arrayBuffer()
        )

        console.log('Generating proof')
        setCurrentStatus('Generating proof')
        const proof = await genProof(witness, provingKey)
        const publicSignals = genPublicSignals(witness, circuit)

        const answerData = {
            questionHash: qn.hash,
            answer,
            proof: JSON.stringify(stringifyBigInts(proof)),
            publicSignals: JSON.stringify(stringifyBigInts(publicSignals)),
        }

        setCurrentStatus('Submitting proof')

        try {
            const resp = await postAns(
                answerData,
            )
            let c = JSON.parse(JSON.stringify(hideVoteBtns))
            c[qn.hash] = true
            setHideVoteBtns(c)
            handleViewAnswersBtnClick(qn)
            setCurrentStatus('Vote registered successfully')

        } catch(err) {
            if (err.code === -32012) {
                setCurrentStatus('Error: you have already voted for this question')
            } else {
                console.error(err)
            }

        }
    }

    const renderVoteWidget = (qn: any) => {
        return (
            <div>
                <button 
                    style={{marginRight: '5px'}}
                    onClick={() => {handleYesNoBtnClick(qn, 'yes')}}
                    className='button is-success'>Yes</button>
                <button
                    onClick={() => {handleYesNoBtnClick(qn, 'no')}}
                    className='button is-danger'>No</button>
            </div>
        )
    }

    const handleViewAnswersBtnClick = async (qn: any) => {
        const a = await listAnsToQn(qn.hash)
        const currentAnswers = JSON.parse(JSON.stringify(answers))
        currentAnswers[qn.hash] = a
        setAnswers(currentAnswers)
    }

    const renderViewAnswersBtn = (qn: any) => {
        return (
            <div>
                <button
                    onClick={() => {handleViewAnswersBtnClick(qn)}}
                    className='button is-link'>
                    View answers
                </button>
            </div>
        )
    }


    const renderAnswerPercentages = (answers) => {
        if (answers.length === 0) {
            return <p>No votes yet</p>
        }

        let totalYes = 0
        let totalNo = 0

        for (let answer of answers) {
            if (answer.answer === 'yes') {
                totalYes ++
            } else if (answer.answer === 'no') {
                totalNo ++
            }
        }

        const percentageYes = (totalYes / answers.length * 100).toFixed(0)
        const percentageNo = (totalNo / answers.length * 100).toFixed(0)

        return (
            <p>
                {percentageYes}% yes; {percentageNo}% no
            </p>
        )
    }

    const renderQns = (qns) => {
        return (
            <table className='table'>
                <thead>
                    <tr>
                        <th>Question</th>
                        <th>Vote</th>
                        <th>Answers</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        qns.map((qn: any, i: number) => 
                            <tr key={i}>
                                <td>{qn.question}</td>
                                <td>{!hideVoteBtns[qn.hash] && renderVoteWidget(qn)}</td>
                                <td>
                                    {Object.keys(answers).indexOf(qn.hash) > -1 ?
                                        renderAnswerPercentages(answers[qn.hash])
                                        : 
                                        renderViewAnswersBtn(qn)
                                    }
                                </td>
                            </tr>
                        )
                    }
                </tbody>
            </table>
        )
    }

    // Retrieve questions via the API
    return (
        <div className='columns'>
            <div className='column is-12-mobile is-8-desktop is-offset-2-desktop'>
                <h2 className='subtitle'>
                    OneOfUs: an attendees-only voting app for <a
                        href='https://devcon.org' target='_blank'>Devcon 5</a>
                </h2>

                <div className='column is-full'>
                    <input id='questionInput'
                        onChange={(e) => {
                            setAskedQn(e.target.value)
                        }}
                        className='input question_input' />
                </div>

                <div className='column is-full'>
                    <button 
                        className='button askBtn is-success'
                        onClick={handleAskBtnClick}
                    >
                        Ask a question
                    </button>
                </div>

                { postQnSuccess && 
                    <div className='column is-full'>
                        <p>Question posted.</p>
                    </div>
                }

                { !fetchedQns &&
                    <div className='column is-full'>
                        <p>Loading questions...</p>
                    </div>
                }

                { fetchedQns && qns.length === 0 &&
                    <div className='column is-full'>
                        <p>There are no questions yet.</p>
                    </div>
                }

                { currentStatus && currentStatus.length > 0 &&
                    <div className='column is-full'>
                        <pre>
                            {currentStatus}
                        </pre>
                    </div>
                }

                { fetchedQns && qns.length > 0 &&
                    <div className='column is-full'>
                        { renderQns(qns) }
                    </div>
                }

            </div>
        </div>
    )
}

export default VoteRoute
