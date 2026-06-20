export const VIDEO_TYPES = [
  { id: "all", label: "All" },
  { id: "music", label: "Music" },
  { id: "video", label: "Videos" },
  { id: "audio", label: "Audio" },
  { id: "live", label: "Live" },
];

export function thumbUrl(id, quality = "mqdefault") {
  return `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
}

export function isSaveDataMode() {
  return navigator.connection?.saveData === true;
}

export async function loadVideos() {
  const res = await fetch("videos.json");
  if (!res.ok) throw new Error("Could not load videos");
  const data = await res.json();
  const videos = (data.videos ?? []).map((video) => ({
    id: video.id,
    title: video.title,
    published: video.published || "",
    views: video.views || "",
    url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
    type: video.type || "music",
    sortDate: video.sortDate || 0,
  }));
  return { ...data, videos };
}
