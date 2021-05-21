const { cache, cacheKeys, ttl } = require("./cache");

function actions({ db, user }) {
  function _addComment({ commentAuthorId, content, postId }) {
    return new Promise((res, rej) => {
      db("comments")
        .insert({ user_id: commentAuthorId, content, post_id: postId })
        .returning("id")
        .then(([id]) => {
          res(id);
        })
        .catch((err) => {
          console.log(err);
          rej(err);
        });
    });
  }

  function _getComments(postId) {
    return new Promise((res, rej) => {
      db("comments")
        .select(
          "comments.id",
          "comments.content",
          "comments.created_at",
          "comments.post_id",
          "users.twitter_name as author_twitter_name",
          "users.type as author_type",
          "users.slug as author_slug",
          "users.twitter_screen_name as author_twitter_screen_name",
          "users.twitter_profile_image_url as author_twitter_profile_image_url"
        )
        .leftJoin("users", "comments.user_id", "users.id")
        .where({ "comments.post_id": postId })
        .orderBy("comments.created_at", "asc")
        .then((result) => {
          console.log(result);
          res(result);
        })
        .catch((err) => {
          console.log(err);
          rej(err);
        });
    });
  }

  return {
    addComment: _addComment,
    getComments: _getComments,
  };
}

module.exports = {
  actions,
};
