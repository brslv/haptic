const { cache, cacheKeys, ttl } = require("./cache");

const BROWSABLE_ORDER = {
  BOOSTS: [
    { column: "boosts_count", order: "desc" },
    { column: "products.created_at", order: "desc" },
  ],
  NEWEST: [{ column: "products.created_at", order: "desc" }],
};

function actions({ db, user }) {
  function getProductBySlug({ slug }) {
    return new Promise((res, rej) => {
      const cached = cache.get(cacheKeys.product(slug));
      if (cached) {
        return res(cached);
      }
      return db
        .select()
        .table("products")
        .where({ slug })
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
    return new Promise((res, rej) => {
      db("products")
        .where({ slug, user_id: user.id })
        .update({
          name: input.name,
          description: input.description,
          website: input.website,
          is_public: input.is_public === "on",
          is_listed: input.is_listed === "on",
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
    userId = null,
  } = {}) {
    return new Promise((res, rej) => {
      const cacheKey = cacheKeys.browse(JSON.stringify({ order, userId }));

      const cached = cache.get(cacheKey);

      if (cached) {
        return res(cached);
      }

      const query = db("products")
        .select(
          "products.name",
          "products.slug",
          "products.description",
          "users.id as user_id",
          "users.type as user_type",
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

      query
        .orderBy(order)
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
