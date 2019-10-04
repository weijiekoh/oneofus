import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { fetchQns } from '../utils/fetch'

const MainRoute = () => {
    // the list of all questions fetched from the API
    const [qns, setQns] = useState([])
    // whether we have fetched questions at least once
    const [fetchedQns, setFetchedQns] = useState(false)

    if (!fetchedQns) {
        fetchQns().then(setQns)
        setFetchedQns(true)
    }

    if (fetchQns) {
        console.log(qns)
    }

    // Retrieve questions via the API
    return (
        <div className='columns'>
            <div className='column is-12-mobile is-8-desktop is-offset-2-desktop'>
                <h2 className='subtitle'>
                    Vote
                </h2>

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

                { fetchedQns && qns.length > 0 &&
                    <div className='column is-full'>
                        <p>There are {qns.length} questions.</p>
                    </div>
                }

            </div>
        </div>
    )
}

export default MainRoute
