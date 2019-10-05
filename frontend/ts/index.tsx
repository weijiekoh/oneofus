import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter as Router, Route } from 'react-router-dom'
import Web3Provider from 'web3-react'

import Nav from './nav'
import RegisterRoute from './routes/register'
import AboutRoute from './routes/about'
import VoteRoute from './routes/vote'
import connectors from './web3'

import {
    initStorage,
} from './storage'

const App = () => {
    initStorage()
    return (
        <Web3Provider connectors={connectors} libraryName='ethers.js'>
            <div className='section'>

                <Nav />

                <div className='section'>
                    <div className='container'>
                        <Router>
                            <Route path='/' exact component={VoteRoute} />
                            <Route path='/vote' exact component={VoteRoute} />
                            <Route path='/about' exact component={AboutRoute} />
                            <Route path='/register' exact component={RegisterRoute} />
                        </Router>
                    </div>
                </div>
            </div>
        </Web3Provider>
    )
}

const root = document.getElementById('root')

ReactDOM.render(<App />, root)
