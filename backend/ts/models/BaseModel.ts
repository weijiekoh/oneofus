import { Model, Transaction } from 'objection'
import { DBErrors } from 'objection-db-errors'

// @ts-ignore
class BaseModel extends DBErrors(Model) {
    public static query(_?: Transaction) {
        return super.query()
    }
}

export default BaseModel
