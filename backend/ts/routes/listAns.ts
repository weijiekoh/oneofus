import Answer from '../models/Answer'
import { genValidator } from './utils'

const listAns = async ({ }) => {
    return await Answer.query()
}

const listAnsRoute = {
    route: listAns,
}

export default listAnsRoute
