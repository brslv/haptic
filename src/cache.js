const NodeCache = require("node-cache");

const cache = new NodeCache();

const cacheKeys = {
  notifications: (userId) => `user.notifications.${userId}`,
  productPosts: (productId) => `product.posts.${productId}`,
  product: (slug) => `product.${slug}`,
  productsForUser: (userId) => `product.user.${userId}`,
  browse: (order) => `browse.${order}`,
};

const min = 60;
const ttl = {
  1: min,
  2: min * 2,
  5: min * 5,
  60: min * 60,
  day: min * 60 * 24,
};

module.exports = {
  cache,
  cacheKeys,
  ttl,
};
