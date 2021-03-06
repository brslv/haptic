const knex = require("knex");
const deferFks = require("../src/defer-fks");
const notificationTypes = require("../src/notifications").types;

exports.up = function(knex) {
  return knex.schema
    .hasTable("notifications")
    .then(function(exists) {
      if (!exists) {
        return knex.schema.createTable("notifications", function(t) {
          t.increments("id").primary();

          t.enu("type", notificationTypes);

          t.integer("user_id")
            .unsigned()
            .notNullable();
          t.foreign("user_id")
            .references("id")
            .inTable("users")
            .onDelete("CASCADE");

          t.integer("origin_user_id")
            .unsigned()
            .notNullable();
          t.foreign("origin_user_id")
            .references("id")
            .inTable("users")
            .onDelete("CASCADE");

          t.boolean("is_read")
            .notNullable()
            .defaultTo(false);
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
  return knex.schema.dropTable("notifications");
};
