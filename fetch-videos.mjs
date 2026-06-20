/**
 * Fetch all Joker Di Genius videos from YouTube (channel + search + catalog).
 * Run: node fetch-videos.mjs
 */
import { writeFileSync } from "fs";
import { fetchYouTubeVideos } from "./youtube.js";

function slimVideo(video) {
  const entry = {
    id: video.id,
    title: video.title,
    published: video.published,
    type: video.type,
    sortDate: video.sortDate || 0,
  };
  if (video.views) entry.views = video.views;
  return entry;
}

console.log("Fetching channel uploads, YouTube search, and catalog matches…");
const data = await fetchYouTubeVideos();
const slim = {
  channelId: data.channelId,
  channelUrl: data.channelUrl,
  fetchedAt: data.fetchedAt,
  total: data.total,
  channelCount: data.channelCount,
  videos: data.videos.map(slimVideo),
};
writeFileSync("videos.json", JSON.stringify(slim) + "\n");
console.log(
  `Saved ${data.total} videos (${data.channelCount} from @${"jokerdigenius"} channel) to videos.json`
);
