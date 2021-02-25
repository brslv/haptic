const knex = require("knex");
const deferFks = require("../src/defer-fks");

exports.up = function(knex) {
  return knex.schema
    .hasTable("post_boosts")
    .then(function(exists) {
      if (!exists) {
        return knex.schema.createTable("post_boosts", function(t) {
          t.increments("id").primary();
          t.integer("post_id")
            .unsigned()
            .notNullable();
          t.foreign("post_id")
            .references("id")
            .inTable("posts")
            .onDelete("CASCADE");
          t.integer("user_id")
            .unsigned()
            .notNullable();
          t.foreign("user_id")
            .references("id")
            .inTable("users")
            .onDelete("CASCADE");
          t.unique(["post_id", "user_id"]);
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
  return knex.schema.dropTable("post_boosts");
};
