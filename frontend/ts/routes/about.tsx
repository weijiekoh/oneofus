import * as React from 'react'
import ReactDOM from 'react-dom'

const AboutRoute = () => {
    return (
        <div className='columns'>
            <div className='column is-12-mobile is-8-desktop is-offset-2-desktop'>
                <h2 className='subtitle'>
                    About OneOfUs
                </h2>
                
                <p>
                    Click <a 
                        target="_blank"
                        href="https://github.com/weijiekoh/oneofus">here</a>
                    {' '} for the source code, build instructions, and more
                    information about OneOfUs.
                </p>

            </div>
        </div>
    )
}

export default AboutRoute
