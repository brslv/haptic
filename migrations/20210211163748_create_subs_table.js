const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("subs").then(function(exists) {
    if (!exists) {
      return knex.schema.createTable("subs", function(t) {
        t.increments("id").primary();
        t.string("email", 200)
          .unique()
          .notNullable();
        t.boolean("accepted_marketing_mails").defaultTo(false);
        t.timestamp("created_at").defaultTo(knex.fn.now());
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable("subs");
};
