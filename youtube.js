const CHANNEL_HANDLE = "jokerdigenius";
const CHANNEL_ID = "UC_-AMFry-3GZ8r-e1Lu5OCA";
const CHANNEL_URL =
  "https://youtube.com/@jokerdigenius?si=3eyiUH6MzPMeHtMF";
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

const INNERTUBE_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240603.00.00",
    hl: "en",
    gl: "GB",
  },
};

export const SOCIAL = {
  youtube: CHANNEL_URL,
  facebook: "https://www.facebook.com/jokerdigenius",
  instagram:
    "https://www.instagram.com/joker_di_genius?igsh=c2VuaWp5ZGFhd3pi&utm_source=qr",
  tiktok:
    "https://www.tiktok.com/@jokerdigenius?_t=8kYvxQOHShq&_r=1",
  phone: "+447917431957",
  phoneDisplay: "+44 7917 431957",
  whatsapp: "https://wa.me/447917431957",
};

export const VIDEO_TYPES = [
  { id: "all", label: "All" },
  { id: "music", label: "Music" },
  { id: "video", label: "Videos" },
  { id: "audio", label: "Audio" },
  { id: "live", label: "Live" },
];

const CATALOG_TRACKS = [
  "Ndafunga",
  "Electric Fish",
  "Rolling",
  "Dance Around",
  "Ndichifa",
  "Never Easy",
  "Zvikuzikanwa",
  "Father God",
  "Type Yako",
  "Number One",
  "I Cry Tribute to Di Apprentice",
  "Gwan Talk",
  "Madlevel Riddim",
  "Gel Dem Want Me",
  "Tiri Kutyisa",
  "Money Friend",
  "Nuh New Friend",
  "Usade Kundisaiza",
  "Real Champion",
  "Tichaitasei",
  "Handimire Ngoma",
  "Kukutora",
  "Eriya",
  "Fire Burn",
  "Bubble Up",
];

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function tag(name, block) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`);
  const m = block.match(re);
  return m ? decodeHtml(m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()) : "";
}

export function guessType(title) {
  const t = title.toLowerCase();
  if (t.includes("official video") || t.includes("visualizer")) return "video";
  if (t.includes("official audio")) return "audio";
  if (t.includes("performing live") || t.includes(" live ") || t.includes(" live@"))
    return "live";
  if (t.includes("freestyle") || t.includes("speech")) return "video";
  return "music";
}

function extractInitialData(html) {
  const match = html.match(/var ytInitialData = (.+?);<\/script>/);
  if (!match) throw new Error("ytInitialData not found");
  return JSON.parse(match[1]);
}

function walk(obj, fn) {
  if (!obj || typeof obj !== "object") return;
  fn(obj);
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) value.forEach((item) => walk(item, fn));
    else if (value && typeof value === "object") walk(value, fn);
  }
}

function splitPublished(text) {
  if (!text) return { views: "", published: "" };
  const parts = text.split("·").map((p) => p.trim());
  if (parts.length >= 2) {
    return { views: parts[0], published: parts.slice(1).join(" · ") };
  }
  return { views: "", published: text };
}

function parseRelativeDate(text) {
  if (!text) return 0;

  const cleaned = text.trim().toLowerCase();
  const now = new Date();
  const match = cleaned.match(
    /(\d+)\s*(second|sec|minute|min|hour|hr|day|week|wk|month|mo|year|yr)s?\s+ago/
  );

  if (!match) return 0;

  const value = Number(match[1]);
  const unit = match[2];
  const date = new Date(now);

  if (unit === "second" || unit === "sec") {
    date.setSeconds(date.getSeconds() - value);
  }
  if (unit === "minute" || unit === "min") {
    date.setMinutes(date.getMinutes() - value);
  }
  if (unit === "hour" || unit === "hr") {
    date.setHours(date.getHours() - value);
  }
  if (unit === "day") date.setDate(date.getDate() - value);
  if (unit === "week" || unit === "wk") date.setDate(date.getDate() - value * 7);
  if (unit === "month" || unit === "mo") date.setMonth(date.getMonth() - value);
  if (unit === "year" || unit === "yr") date.setFullYear(date.getFullYear() - value);

  return date.getTime();
}

function normalizeVideo(raw) {
  const { views, published } = splitPublished(raw.published || "");
  return {
    id: raw.id,
    title: raw.title,
    published: published || raw.published || "",
    views: views || raw.views || "",
    channel: raw.channel || "",
    url: raw.url || `https://www.youtube.com/watch?v=${raw.id}`,
    thumbnail:
      raw.thumbnail || `https://i.ytimg.com/vi/${raw.id}/hqdefault.jpg`,
    type: guessType(raw.title),
    source: raw.source || "youtube",
    sortDate: raw.sortDate || parseRelativeDate(published || raw.published || ""),
  };
}

function compareByDate(a, b) {
  const dateDiff = (b.sortDate || 0) - (a.sortDate || 0);
  if (dateDiff !== 0) return dateDiff;

  if (a.source === "channel" && b.source !== "channel") return -1;
  if (b.source === "channel" && a.source !== "channel") return 1;

  return a.title.localeCompare(b.title);
}

function parseLockup(lockup, source) {
  const id = lockup.contentId;
  if (!id || id.length !== 11) return null;
  const meta = lockup.metadata?.lockupMetadataViewModel;
  const title = meta?.title?.content?.trim();
  if (!title) return null;

  const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows ?? [];
  const parts = rows.flatMap((row) => row.metadataParts ?? []);
  const publishedText =
    parts.map((p) => p.text?.content).filter(Boolean).join(" · ") || "";

  const thumbSources =
    lockup.contentImage?.thumbnailViewModel?.image?.sources ?? [];
  const thumbnail =
    thumbSources.at(-1)?.url?.split("?")[0] ||
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return normalizeVideo({
    id,
    title,
    published: publishedText,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnail,
    source,
  });
}

function parseVideoRenderer(renderer, source) {
  const id = renderer.videoId;
  if (!id) return null;
  const title =
    renderer.title?.runs?.[0]?.text ||
    renderer.title?.simpleText ||
    "Untitled";
  const published =
    renderer.publishedTimeText?.simpleText ||
    renderer.publishedTimeText?.runs?.[0]?.text ||
    "";
  const channel =
    renderer.ownerText?.runs?.[0]?.text ||
    renderer.longBylineText?.runs?.[0]?.text ||
    "";
  const thumbs = renderer.thumbnail?.thumbnails ?? [];
  const thumbnail =
    thumbs.at(-1)?.url?.split("?")[0] ||
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return normalizeVideo({
    id,
    title,
    published,
    channel,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnail,
    source,
  });
}

function collectFromData(data, source) {
  const videos = [];
  const continuations = [];

  walk(data, (node) => {
    if (node.lockupViewModel) {
      const video = parseLockup(node.lockupViewModel, source);
      if (video) videos.push(video);
    }
    if (node.videoRenderer) {
      const video = parseVideoRenderer(node.videoRenderer, source);
      if (video) videos.push(video);
    }
    if (node.richItemRenderer?.content?.videoRenderer) {
      const video = parseVideoRenderer(
        node.richItemRenderer.content.videoRenderer,
        source
      );
      if (video) videos.push(video);
    }
    if (
      node.continuationItemRenderer?.continuationEndpoint?.continuationCommand
        ?.token
    ) {
      continuations.push(
        node.continuationItemRenderer.continuationEndpoint.continuationCommand
          .token
      );
    }
    if (node.continuationCommand?.token) {
      continuations.push(node.continuationCommand.token);
    }
  });

  return { videos, continuation: continuations[0] ?? null };
}

async function fetchContinuation(endpoint, token) {
  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/${endpoint}?prettyPrint=false`,
    {
      method: "POST",
      headers: {
        ...FETCH_HEADERS,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context: INNERTUBE_CONTEXT,
        continuation: token,
      }),
    }
  );
  if (!res.ok) throw new Error(`${endpoint} failed (${res.status})`);
  return res.json();
}

async function paginate(initialData, endpoint, source, maxPages = 30) {
  let { videos, continuation } = collectFromData(initialData, source);
  const seen = new Set(videos.map((v) => v.id));
  let page = 1;

  while (continuation && page < maxPages) {
    page++;
    const data = await fetchContinuation(endpoint, continuation);
    const next = collectFromData(data, source);
    const fresh = next.videos.filter((v) => !seen.has(v.id));
    fresh.forEach((v) => seen.add(v.id));
    videos = videos.concat(fresh);
    continuation = next.continuation;
    if (!fresh.length) break;
  }

  return videos;
}

function isRelevantVideo(video) {
  const title = video.title.toLowerCase();
  const channel = video.channel.toLowerCase();

  if (video.source === "channel") return true;
  if (channel.includes("joker di genius")) return true;
  if (/\bjoker\s*di\s*genius\b/i.test(video.title)) return true;
  if (/\bjoker\s*digenius\b/i.test(video.title)) return true;
  if (/\bjoker\s*di_genius\b/i.test(video.title)) return true;

  if (
    title.includes("joker") &&
    (title.includes("honey bee") ||
      title.includes("honey b") ||
      title.includes("shellaz") ||
      title.includes("poptain") ||
      title.includes("feat. joker") ||
      title.includes("feat joker"))
  ) {
    return true;
  }

  return false;
}

function isNoiseVideo(video) {
  const text = `${video.title} ${video.channel}`.toLowerCase();
  const noise = [
    "dark knight",
    "heath ledger",
    "injustice",
    "wasn't in the script",
    "joaquin",
    "#shorts #joker",
    "bank heist",
    "deranged artist",
    "reel talk",
    "singapore produces",
    "elects",
    "catch this genius joker detail",
    "improvisation",
    "they think you're weird",
    "joker speech",
  ];
  if (noise.some((n) => text.includes(n))) return true;
  if (
    /genius joker|joker.*genius|jokers.*genius/i.test(video.title) &&
    !/\bjoker\s*di\s*genius\b/i.test(video.title) &&
    !/\bjoker\s*digenius\b/i.test(video.title)
  ) {
    return true;
  }
  return false;
}

export async function fetchChannelVideos() {
  const res = await fetch(
    `https://www.youtube.com/@${CHANNEL_HANDLE}/videos`,
    { headers: FETCH_HEADERS }
  );
  if (!res.ok) throw new Error(`Channel fetch failed (${res.status})`);
  const html = await res.text();
  const data = extractInitialData(html);
  return paginate(data, "browse", "channel", 20);
}

export async function searchVideos(query, maxPages = 8) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const html = await res.text();
  const data = extractInitialData(html);
  return paginate(data, "search", "search", maxPages);
}

function mergeVideos(lists) {
  const map = new Map();
  for (const list of lists) {
    for (const video of list) {
      if (!video?.id || map.has(video.id)) continue;
      map.set(video.id, video);
    }
  }
  return [...map.values()];
}

export function parseRssXml(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
    const block = m[1];
    const id = tag("yt:videoId", block) || tag("videoId", block);
    const title = tag("title", block);
    const published = tag("published", block);
    return normalizeVideo({
      id,
      title,
      published,
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      source: "channel",
    });
  });
}

export async function fetchYouTubeVideos() {
  const channelVideos = await fetchChannelVideos();
  const channelIds = new Set(channelVideos.map((v) => v.id));

  const searchMain = await searchVideos("Joker Di Genius", 10);
  const searchFiltered = searchMain.filter(
    (v) => isRelevantVideo(v) && !isNoiseVideo(v)
  );

  const catalogQueries = CATALOG_TRACKS.filter(Boolean);
  const catalogResults = [];
  for (const track of catalogQueries) {
    const results = await searchVideos(`Joker Di Genius ${track}`, 2);
    const match = results.find(
      (v) =>
        isRelevantVideo(v) &&
        !isNoiseVideo(v) &&
        !channelIds.has(v.id) &&
        v.title.toLowerCase().includes(track.toLowerCase().slice(0, 6))
    );
    if (match) catalogResults.push({ ...match, source: "catalog" });
  }

  const videos = mergeVideos([channelVideos, searchFiltered, catalogResults]);

  videos.sort(compareByDate);

  return {
    channelId: CHANNEL_ID,
    channelUrl: CHANNEL_URL,
    fetchedAt: new Date().toISOString().slice(0, 10),
    total: videos.length,
    channelCount: channelVideos.length,
    videos,
  };
}

export async function loadVideos() {
  const res = await fetch("videos.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("Could not load videos");
  return res.json();
}
