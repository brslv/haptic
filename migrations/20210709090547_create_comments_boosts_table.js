const knex = require("knex");
const deferFks = require("../src/defer-fks");

exports.up = function(knex) {
  return knex.schema
    .hasTable("comments_boosts")
    .then(function(exists) {
      if (!exists) {
        return knex.schema.createTable("comments_boosts", function(t) {
          t.increments("id").primary();
          t.integer("comment_id")
            .unsigned()
            .notNullable();
          t.foreign("comment_id")
            .references("id")
            .inTable("comments")
            .onDelete("CASCADE");
          t.integer("user_id")
            .unsigned()
            .notNullable();
          t.foreign("user_id")
            .references("id")
            .inTable("users")
            .onDelete("CASCADE");
          t.unique(["comment_id", "user_id"]);
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
  return knex.schema.dropTable("comments_boosts");
};
