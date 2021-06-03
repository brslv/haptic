const knex = require("knex");

exports.up = function(knex) {
  return knex.schema.hasTable("products").then(function(exists) {
    if (exists) {
      return knex.schema.table("products", function(t) {
        t.string("cover_image_url")
          .nullable()
          .defaultTo(null);
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.table("products", function(t) {
    t.dropColumn("cover_image_url");
  });
};
