import { loadVideos, VIDEO_TYPES, thumbUrl, isSaveDataMode } from "./data.js";

const listEl = document.getElementById("track-list");
const filtersEl = document.getElementById("filters");
const searchEl = document.getElementById("search");
const noResultsEl = document.getElementById("no-results");
const countLabelEl = document.getElementById("track-count-label");
const loadingEl = document.getElementById("loading");
const loadMoreWrap = document.getElementById("load-more-wrap");
const loadMoreBtn = document.getElementById("load-more");
const playerModal = document.getElementById("player-modal");
const playerFrame = document.getElementById("player-frame");
const playerTitle = document.getElementById("player-title");
const playerOpen = document.getElementById("player-open");
const playerClose = document.getElementById("player-close");
const menuLinks = [...document.querySelectorAll(".menu-link")];
const sectionIds = ["about", "music", "contact"];

const saveData = isSaveDataMode();
const PAGE_SIZE = saveData ? 8 : 12;
const THUMB_QUALITY = saveData ? "default" : "mqdefault";

let videos = [];
let activeFilter = "all";
let query = "";
let visibleCount = PAGE_SIZE;
let thumbObserver = null;

function typeLabel(id) {
  return VIDEO_TYPES.find((t) => t.id === id)?.label ?? id;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderFilters() {
  filtersEl.innerHTML = VIDEO_TYPES.map(
    (cat) =>
      `<button type="button" class="filter-btn${cat.id === activeFilter ? " active" : ""}" data-filter="${cat.id}">${cat.label}</button>`
  ).join("");

  filtersEl.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      visibleCount = PAGE_SIZE;
      renderFilters();
      renderVideos();
    });
  });
}

function filteredVideos() {
  return videos
    .filter((video) => {
      const matchesFilter =
        activeFilter === "all" || video.type === activeFilter;
      const q = query.trim().toLowerCase();
      const matchesSearch = !q || video.title.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      const dateDiff = (b.sortDate || 0) - (a.sortDate || 0);
      if (dateDiff !== 0) return dateDiff;
      return a.title.localeCompare(b.title);
    });
}

function openPlayer(video) {
  if (saveData) {
    window.open(video.url, "_blank", "noopener,noreferrer");
    return;
  }

  playerTitle.textContent = video.title;
  playerOpen.href = video.url;
  playerFrame.src = `https://www.youtube-nocookie.com/embed/${video.id}?rel=0`;
  playerModal.showModal();
}

function closePlayer() {
  playerFrame.src = "";
  playerModal.close();
}

function setActiveMenuLink(activeId) {
  menuLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${activeId}`;
    link.classList.toggle("is-active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function setupMenuHighlight() {
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!sections.length || !menuLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible?.target?.id) {
        setActiveMenuLink(visible.target.id);
      }
    },
    {
      rootMargin: "-72px 0px -55% 0px",
      threshold: [0.2, 0.35, 0.5, 0.7],
    }
  );

  sections.forEach((section) => observer.observe(section));
  setActiveMenuLink(sections[0].id);
}

function setupThumbObserver() {
  if (thumbObserver) thumbObserver.disconnect();

  thumbObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        const src = img.dataset.src;
        if (src) {
          img.src = src;
          img.removeAttribute("data-src");
        }
        observer.unobserve(img);
      });
    },
    { rootMargin: "120px 0px", threshold: 0.01 }
  );
}

function observeThumbs() {
  listEl.querySelectorAll("img[data-src]").forEach((img) => {
    thumbObserver.observe(img);
  });
}

function videoCardHtml(video) {
  const meta = [video.views, video.published].filter(Boolean).join(" · ");
  return `
    <button type="button" class="video-card" data-id="${video.id}" role="listitem">
      <span class="video-thumb-wrap">
        <img data-src="${thumbUrl(video.id, THUMB_QUALITY)}" alt="" class="video-thumb" width="120" height="68" decoding="async">
        <span class="video-play-badge" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
        </span>
      </span>
      <span class="video-info">
        <span class="video-title">${video.title}</span>
        <span class="video-meta">${meta || formatDate(video.published)} · ${typeLabel(video.type)}</span>
      </span>
      <span class="video-tag">${typeLabel(video.type)}</span>
    </button>`;
}

function bindVideoCards() {
  listEl.querySelectorAll(".video-card").forEach((card) => {
    card.addEventListener("click", () => {
      const video = videos.find((v) => v.id === card.dataset.id);
      if (video) openPlayer(video);
    });
  });
}

function updateLoadMore(items) {
  const hasMore = visibleCount < items.length;
  loadMoreWrap.hidden = !hasMore;
  if (hasMore) {
    loadMoreBtn.textContent = `Load more (${items.length - visibleCount} left)`;
  }
}

function renderVideos() {
  const items = filteredVideos();
  countLabelEl.textContent = saveData
    ? `${items.length} videos — smaller images, opens on YouTube`
    : `${items.length} from YouTube — tap to watch`;

  if (!items.length) {
    listEl.innerHTML = "";
    loadMoreWrap.hidden = true;
    noResultsEl.hidden = false;
    return;
  }

  noResultsEl.hidden = true;
  const slice = items.slice(0, visibleCount);
  listEl.innerHTML = slice.map((video) => videoCardHtml(video)).join("");
  bindVideoCards();
  observeThumbs();
  updateLoadMore(items);
}

searchEl.addEventListener("input", () => {
  query = searchEl.value;
  visibleCount = PAGE_SIZE;
  renderVideos();
});

loadMoreBtn.addEventListener("click", () => {
  const items = filteredVideos();
  const previousCount = visibleCount;
  visibleCount = Math.min(visibleCount + PAGE_SIZE, items.length);
  const nextItems = items.slice(previousCount, visibleCount);
  listEl.insertAdjacentHTML(
    "beforeend",
    nextItems.map((video) => videoCardHtml(video)).join("")
  );
  bindVideoCards();
  observeThumbs();
  updateLoadMore(items);
});

playerClose.addEventListener("click", closePlayer);
playerModal.addEventListener("click", (e) => {
  if (e.target === playerModal) closePlayer();
});
playerModal.addEventListener("cancel", () => {
  playerFrame.src = "";
});

async function init() {
  setupThumbObserver();
  renderFilters();
  setupMenuHighlight();
  try {
    const data = await loadVideos();
    videos = data.videos ?? [];
    loadingEl.hidden = true;
    const channelNote = data.channelCount
      ? ` · ${data.channelCount} on channel`
      : "";
    countLabelEl.textContent = saveData
      ? `${videos.length} videos${channelNote} — data saver on`
      : `${videos.length} videos from YouTube${channelNote}`;
    renderVideos();
  } catch {
    loadingEl.textContent = "Could not load YouTube videos. Please try again later.";
  }
}

init();
