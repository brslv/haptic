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
    data.is_public = input.is_public === "on";
    data.is_listed = input.is_listed === "on";

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

  function getRecentlyUpdatedProducts({ limit = 8 }) {
    return new Promise((res, rej) => {
      const cacheKey = cacheKeys.browsableProductsForLatestPosts();
      const cached = cache.get(cacheKey);

      if (cached) {
        return res(cached);
      }

      /*
       
      select
        name,
        max(last_post_created_at)
      from
        (select
          posts.created_at as last_post_created_at,
          products.name as name
            from posts
            left join products
            on posts.product_id = products.id
            where products.is_listed = true
            and products.is_public = true
            order by posts.created_at desc
        )
      as foo
      group by name
      order by max desc
      limit 8;

       */

      const fields = [
          'name',
          'slug',
          'description',
          'cover_image_url',
          'logo_url',
          'boosts_count',]
      const query = db
        .queryBuilder()
        .select(
          ...fields
        )
        .max('latest_post_created_at', { as: "created_at_max" })
        .from(
          db
            .queryBuilder()
            .select(
              'posts.created_at as latest_post_created_at',
              'products.name as name',
              'products.slug as slug',
              'products.description as description',
              'products.cover_image_url as cover_image_url',
              'products.logo_url as logo_url',
              db("product_boosts")
                .count()
                .whereRaw("product_id = products.id")
                .as("boosts_count")
            )
            .from('posts')
            .leftJoin('products', 'products.id', 'posts.product_id')
            .where({ 'products.is_listed': true, 'products.is_public': true })
            .orderBy([{column:'posts.created_at', order: 'desc'}])
            .as('product_with_latest_post_date_table')
        )
        .groupBy(fields)
        .orderBy([{ column: 'created_at_max', order: 'desc' }])
        .limit(limit);

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
    getRecentlyUpdatedProducts,
    getMyProducts,
    updateProduct,
    delProduct,
  };
}

module.exports = {
  BROWSABLE_ORDER,
  actions,
};
