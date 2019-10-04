//#### oou_list_qns

//Parameters: none

//Returns:

//- `questions`: as an list of objects. Each object contains the following keys:

    //- `datetime` as a `number`: the time at which the question was posted, in Unix time

    //- `question` as a `string`: the text of the question
    
    //- `sig` as the signature provided by the user who posted the question


import Question from '../models/Question'
import { genValidator } from './utils'

const listQns = async ({ }) => {
    const qns = await Question.query()

    return qns
}

const listQnsRoute = {
    route: listQns,
}

export default listQnsRoute
