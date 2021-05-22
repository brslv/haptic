exports.up = function(knex) {
  return knex.schema.alterTable("notifications_post_boosts", async (t) => {
    t.dropForeign("post_id");
    t.foreign("post_id")
      .references("posts.id")
      .onDelete("SET NULL");
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable("users", async (t) => {
    t.dropForeign("post_id");

    t.foreign("post_id")
      .references("posts.id")
      .onDelete("CASCADE");
  });
};
