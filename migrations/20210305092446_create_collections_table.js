const knex = require("knex");
const deferFks = require("../src/defer-fks");

exports.up = function(knex) {
  return knex.schema
    .hasTable("collections")
    .then(function(exists) {
      if (!exists) {
        return knex.schema.createTable("collections", function(t) {
          t.increments("id").primary();

          t.integer("product_id")
            .unsigned()
            .notNullable();
          t.foreign("product_id")
            .references("id")
            .inTable("products")
            .onDelete("CASCADE");

          t.integer("user_id")
            .unsigned()
            .notNullable();
          t.foreign("user_id")
            .references("id")
            .inTable("users")
            .onDelete("CASCADE");

          t.unique(["product_id", "user_id"]);

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
  return knex.schema.dropTable("collections");
};
