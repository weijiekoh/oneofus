import { Model, RelationMappings } from 'objection'
import BaseModel from './BaseModel'

export default class Answer extends BaseModel {
    static get tableName() {
        return 'Answer'
    }

	static get idColumn() {
		return 'id'
	}
}
