const Queue = require("bull");

function loadNotificationsQueue() {
  const queue = new Queue("notifications-queue", process.env.REDIS_URL); // @TODO

  // consumer
  queue.process(async function processJob(job) {
    console.log({ job });

    const data = job.data;
    const type = data.type;
    const details = data.details;

    switch (type) {
      case "comment": {
        const postId = details.postId;
        const commentAuthorId = details.commentAuthorId;
        const content = details.content;

        // add notifications to the database
        // for every user that's in the thread of comments
        console.log("processing comment", { postId, commentAuthorId, content });

        return { ok: 1 };
      }
      default:
        return { ok: 0 };
    }
  });

  queue.on("completed", function completedJob(job, result) {
    console.log("job completed", { job, result });
  });

  // producers
  async function _comment({ postId, commentAuthorId, content }) {
    const jobData = {
      type: "comment",
      details: {
        postId,
        commentAuthorId,
        content,
      },
    };
    console.log("producing comment job", jobData);
    await queue.add(jobData);
  }

  const jobs = {
    comment: _comment,
  };

  return {
    queue,
    jobs,
  };
}

module.exports = { loadNotificationsQueue };
