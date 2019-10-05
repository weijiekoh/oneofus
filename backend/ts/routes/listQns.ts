import Question from '../models/Question'
import { genValidator } from './utils'

const listQns = async ({ }) => {
    const qns = await Question.query().orderBy('createdAt', 'desc')

    return qns
}

const listQnsRoute = {
    route: listQns,
}

export default listQnsRoute
