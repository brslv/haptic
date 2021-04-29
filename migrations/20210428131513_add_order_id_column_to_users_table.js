const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("users").then(function(exists) {
    if (exists) {
      return knex.schema.table("users", function(t) {
        t.string("order_id")
          .nullable()
          .defaultTo(null);
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.table("users", function(t) {
    t.dropColumn("order_id");
  });
};
