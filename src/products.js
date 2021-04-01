const { cache, cacheKeys, ttl } = require("./cache");

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
          cache.set(cacheKeys.product(slug), result, ttl[5]);
          res(result);
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

  return { getProductBySlug, getMyProducts, updateProduct };
}

module.exports = {
  actions,
};
