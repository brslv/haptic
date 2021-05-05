const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("users").then(function(exists) {
    if (exists) {
      return knex.schema.table("users", function(t) {
        t.dropColumn("stripe_customer_id");
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.table("users", function(t) {
    t.string("stripe_customer_id", 100).nullable();
  });
};
