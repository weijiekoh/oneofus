import Answer from '../models/Answer'
import { genValidator } from './utils'

const listAnsToQn = async ({ questionHash }) => {
    return await Answer.query()
        .where('questionHash', questionHash)
}

const listAnsToQnRoute = {
    route: listAnsToQn,
}

export default listAnsToQnRoute
