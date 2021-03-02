const knex = require("knex");
const deferFks = require("../src/defer-fks");

exports.up = function(knex) {
  return knex.schema
    .hasTable("product_tools")
    .then(function(exists) {
      if (!exists) {
        return knex.schema.createTable("product_tools", function(t) {
          t.increments("id").primary();
          t.string("text", 100).notNullable();

          t.integer("product_id")
            .unsigned()
            .notNullable();
          t.foreign("product_id")
            .references("id")
            .inTable("products")
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
  return knex.schema.dropTable("product_tools");
};
