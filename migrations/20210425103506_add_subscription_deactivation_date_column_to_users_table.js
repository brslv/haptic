const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("users").then(function(exists) {
    if (exists) {
      return knex.schema.table("users", function(t) {
        t.string("subscription_deactivation_date")
          .nullable()
          .defaultTo(null);
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.table("users", function(t) {
    t.dropColumn("subscription_deactivation_date");
  });
};
