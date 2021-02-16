const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("products").then(function(exists) {
    if (!exists) {
      return knex.schema.createTable("products", function(t) {
        t.increments("id").primary();
        t.string("name", 200).notNullable();
        t.string("slug", 200)
          .unique()
          .notNullable();
        t.timestamp("created_at")
          .notNullable()
          .defaultTo(knex.fn.now());
        t.timestamp("updated_at").nullable();
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable("products");
};
