import { Model } from 'objection'
import BaseModel from './BaseModel'

export default class Question extends BaseModel {
    static get tableName() {
        return 'Question'
    }

	static get idColumn() {
		return 'id'
	}
}
