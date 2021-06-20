import { $, turbo, onFrameLoaded } from "../utils";

export default function twitter() {
  function load() {
    const $els = { $links: $(".prose a") };
    const twitterLinks = getTwitterLinks($els);
    setTwitterLinksToLoadingState(twitterLinks);

    if (twttr && twitterLinks && twitterLinks.length) {
      twttr.ready(function() {
        twttr.widgets.load();
        turnTwitterLinksIntoEmbeds($els, twitterLinks);
      });
    }
  }

  function turnTwitterLinksIntoEmbeds($els, twitterLinks) {
    const $allLinksOnPage = $els.$links;

    twitterLinks.forEach((link) => {
      const { $link, matchData } = link;
      const tweetId = matchData.id;
      const $loader = $(`[data-twitter-widget-loader="${$link.attr("href")}"]`);
      const $div = replaceLoaderWithWidget($loader, tweetId);
      twttr.widgets
        .createTweet(tweetId, $div.get(0) /* container */, {
          align: "center",
          width: "auto",
        })
        .then(function(el) {
          el.style.float = "initial";
        });
    });

    function replaceLoaderWithWidget($link, tweetId) {
      const $div = $(
        `<div data-tweet-embed-container id="tweet_embed_${tweetId}" class="w-full"></div>`
      );
      $link.replaceWith($div);
      return $div;
    }
  }

  function getTwitterLinks($els) {
    const twitterLinkRegex = /https:\/\/twitter.com\/(.+)\/status\/(\d+)/g;
    const twitterLinks = [];
    $els.$links.each((_, link) => {
      const $link = $(link);
      const href = $link.attr("href");
      const match = [...href.matchAll(twitterLinkRegex)][0];

      if (match && match.length) {
        twitterLinks.push({ $link: $link, matchData: { id: match[2] } });
      }
    });
    return twitterLinks;
  }

  function setTwitterLinksToLoadingState(twitterLinks) {
    twitterLinks.forEach((link) => {
      link.$link.replaceWith(
        `<div data-twitter-widget-loader="${link.$link.attr(
          "href"
        )}" class="flex items-center justify-center text-xs text-gray-500 w-full flex items-center justify-center bg-gray-100 border border-gray-100 animate-pulse" style="height: 200px">Loading twitter widget...</div>`
      );
    });
  }

  turbo.load(() => {
    load();
    $(document).on("haptic:post-preview", () => load());
    onFrameLoaded("browse-posts-list", load);
  });

  turbo.beforeCache(() => {
    $(document).off("haptic:post-preview", () => load());
  });
}
