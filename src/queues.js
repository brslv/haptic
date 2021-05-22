const Queue = require("bull");
const notifications = require("./notifications");

function loadNotificationsQueue({ db }) {
  const queue = new Queue("notifications-queue", process.env.REDIS_URL); // @TODO

  // consumer
  queue.process(async function processJob(job) {
    const data = job.data;
    const type = data.type;
    const user = data.user;
    const details = data.details;

    switch (type) {
      case "comment": {
        // add notifications to the database
        // for every user that's in the thread of comments
        notifications.actions({ db, user }).add("comment", details);

        return { ok: 1 };
      }
      default:
        return { ok: 0 };
    }
  });

  // producers
  async function _commentNotification(
    { userId, postId, commentAuthorId, content, commentId },
    user
  ) {
    const jobData = {
      type: "comment",
      user,
      details: {
        userId,
        postId,
        commentAuthorId,
        content,
        commentId,
      },
    };
    await queue.add(jobData);
  }

  const jobs = {
    commentNotification: _commentNotification,
  };

  return {
    queue,
    jobs,
  };
}

module.exports = { loadNotificationsQueue };
