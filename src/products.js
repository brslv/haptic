const { cache, cacheKeys, ttl } = require("./cache");

const BROWSABLE_ORDER = {
  BOOSTS: [
    { column: "boosts_count", order: "desc" },
    { column: "products.created_at", order: "desc" },
  ],
  NEWEST: [{ column: "products.created_at", order: "desc" }],
};

function actions({ db, user }) {
  function getProductBySlug({ slug, user_id }) {
    return new Promise((res, rej) => {
      const cached = cache.get(cacheKeys.product(slug));
      if (cached) {
        return res(cached);
      }
      return db
        .select()
        .table("products")
        .where({ slug, user_id })
        .first()
        .then((result) => {
          cache.set(cacheKeys.product(slug), result, ttl[2]);
          res(result);
        });
    });
  }

  function delProduct({ slug }) {
    return new Promise((res, rej) => {
      db("products")
        .select()
        .where({ slug, user_id: user.id })
        .del()
        .then((result) => {
          cache.del(cacheKeys.product(slug));
          res(result);
        })
        .catch((err) => {
          rej(err);
        });
    });
  }

  function updateProduct({ slug, input }) {
    const data = { ...input, updated_at: new Date() };
    if (input.is_public) data.is_public = input.is_public === "on";
    if (input.is_listed) data.is_listed = input.is_listed === "on";

    return new Promise((res, rej) => {
      db("products")
        .where({ slug, user_id: user.id })
        .update({
          ...data,
        })
        .then((result) => {
          cache.del(cacheKeys.product(slug));
          res(result);
        })
        .catch((err) => rej(err));
    });
  }

  function getBrowsableProducts({
    order = BROWSABLE_ORDER.BOOSTS,
    limit = null,
    userId = null,
  } = {}) {
    return new Promise((res, rej) => {
      const cacheKey = cacheKeys.browse(
        JSON.stringify({ order, limit, userId })
      );

      const cached = cache.get(cacheKey);

      if (cached) {
        return res(cached);
      }

      const query = db("products")
        .select(
          "products.name",
          "products.slug",
          "products.description",
          "products.cover_image_url",
          "products.logo_url",
          "users.id as user_id",
          "users.type as user_type",
          "users.slug as user_slug",
          "users.twitter_profile_image_url as user_twitter_profile_image_url",
          "users.twitter_name as user_twitter_name",
          "users.twitter_screen_name as user_twitter_screen_name",
          db("product_boosts")
            .count()
            .whereRaw("product_id = products.id")
            .as("boosts_count")
        )
        .leftJoin("users", "users.id", "products.user_id")
        .where({ "products.is_public": true, "products.is_listed": true });

      if (userId !== null) {
        query.andWhere({ "products.user_id": userId });
      }

      query.orderBy(order);

      if (limit !== null) {
        query.limit(limit);
      }

      query
        .then((result) => {
          cache.set(cacheKey, result, ttl[2]);
          return res(result);
        })
        .catch((err) => {
          return rej(err);
        });
    });
  }

  function getMyProducts() {
    return new Promise((res) => {
      return db("products")
        .select()
        .where({ user_id: user.id })
        .then((result) => {
          res(result);
        });
    });
  }

  return {
    getProductBySlug,
    getBrowsableProducts,
    getMyProducts,
    updateProduct,
    delProduct,
  };
}

module.exports = {
  BROWSABLE_ORDER,
  actions,
};
