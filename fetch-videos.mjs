/**
 * Fetch all Joker Di Genius videos from YouTube (channel + search + catalog).
 * Run: node fetch-videos.mjs
 */
import { writeFileSync } from "fs";
import { fetchYouTubeVideos } from "./youtube.js";

console.log("Fetching channel uploads, YouTube search, and catalog matches…");
const data = await fetchYouTubeVideos();
writeFileSync("videos.json", JSON.stringify(data, null, 2) + "\n");
console.log(
  `Saved ${data.total} videos (${data.channelCount} from @${"jokerdigenius"} channel) to videos.json`
);
