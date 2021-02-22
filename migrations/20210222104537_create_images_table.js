const knex = require("knex");
const deferFks = require("../src/defer-fks");

exports.up = function(knex) {
  return knex.schema
    .hasTable("images")
    .then(function(exists) {
      if (!exists) {
        return knex.schema.createTable("images", function(t) {
          t.increments("id").primary();
          t.integer("post_id")
            .unsigned()
            .notNullable();
          t.foreign("post_id")
            .references("id")
            .inTable("posts")
            .onDelete("CASCADE");
          t.text("url").notNullable();
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
  return knex.schema.dropTable("images");
};
