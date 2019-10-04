import Knex from 'knex'
exports.up = (knex: Knex) =>  {
    return Promise.all([
        knex.schema.createTable('Question', (table: Knex.TableBuilder) => {
            table.increments('id').primary()
            table.text('question').unique().notNullable()
            table.string('hash', 66).unique().notNullable()
            table.string('sig', 132).unique().notNullable()
            table.dateTime('createdAt').notNullable()
        }),

        knex.schema.createTable('Answer', (table: Knex.TableBuilder) => {
            table.increments('id').primary()
            table.integer('questionId').unsigned().notNullable()
            table.foreign('questionId').references('Question.id')
            table.text('answer').unique().notNullable()
            table.text('hash', 66).unique().notNullable()
            table.text('proof').unique().notNullable()
            table.text('publicSignals').unique().notNullable()
            table.text('nullifierHash').unique().notNullable()
            table.dateTime('createdAt').notNullable()
        })
    ])
}

exports.down = (knex: Knex) => {
    return Promise.all([
        knex.schema.dropTableIfExists('Answer'),
        knex.schema.dropTableIfExists('Question')
    ])
}
