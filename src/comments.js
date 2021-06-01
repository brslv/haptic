const { cache, cacheKeys, ttl } = require("./cache");
const { dateFmt, mdConverter } = require("./utils");

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
          "comments.user_id as user_id",
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
          res([
            ...result.map((comment) => {
              const content = mdConverter.makeHtml(comment.content);
              return {
                ...comment,
                content_md: comment.content,
                content,
                created_at_formatted: dateFmt(comment.created_at),
              };
            }),
          ]);
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
