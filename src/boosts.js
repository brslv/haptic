function actions({ db }) {
  function getProductBoosts(id) {
    return db("product_boosts")
      .select()
      .where({ product_id: id });
  }

  return {
    getProductBoosts,
  };
}

module.exports = {
  actions,
};
