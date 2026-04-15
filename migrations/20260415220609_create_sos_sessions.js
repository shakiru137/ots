/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};

exports.up = function(knex) {
  return knex.schema.raw('CREATE EXTENSION IF NOT EXISTS postgis').then(() => {
    return knex.schema.createTable('sos_sessions', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
      t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      t.enum('type', ['personal', 'third_party']).notNullable()
      t.enum('status', ['active', 'resolved', 'signal_lost']).defaultTo('active')
      t.string('idempotency_key').unique()   // UID + timestamp minute
      t.string('agora_channel')
      t.string('recording_url')             // S3 link after session ends
      t.specificType('last_known_location', 'geography(Point, 4326)')
      t.timestamp('started_at').defaultTo(knex.fn.now())
      t.timestamp('ended_at')
      t.timestamps(true, true)
    })
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('sos_sessions')
}
