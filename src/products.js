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

  return { getProductBySlug, getMyProducts };
}

module.exports = {
  actions,
};
