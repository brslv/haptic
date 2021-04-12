const knex = require("knex");
const deferFks = require("../src/defer-fks");

exports.up = function(knex) {
  return knex.schema
    .hasTable("notifications_post_boosts")
    .then(function(exists) {
      if (!exists) {
        return knex.schema.createTable("notifications_post_boosts", function(
          t
        ) {
          t.increments("id").primary();

          t.integer("notification_id")
            .unsigned()
            .notNullable();
          t.foreign("notification_id")
            .references("id")
            .inTable("notifications")
            .onDelete("CASCADE");

          t.integer("post_id")
            .unsigned()
            .notNullable();
          t.foreign("post_id")
            .references("id")
            .inTable("posts")
            .onDelete("CASCADE");

          t.timestamp("created_at")
            .notNullable()
            .defaultTo(knex.fn.now());
        });
      }
    })
    .then(() => {
      return deferFks(knex);
    })
    .catch((err) => {
      throw err;
    });
};

exports.down = function(knex) {
  return knex.schema.dropTable("notifications_post_boosts");
};
