import { parseArticleVideoSources, type ArticleVideoSource } from "@/lib/article-media-contract";

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function qualityLabel(video: HTMLVideoElement): string {
  const lang = video.closest<HTMLElement>("[lang]")?.lang || document.documentElement.lang;
  if (lang.startsWith("ja")) return "画質";
  if (lang.startsWith("en")) return "Quality";
  if (lang.toLowerCase().includes("hant")) return "畫質";
  return "画质";
}

export function enhanceArticleVideo(video: HTMLVideoElement): () => void {
  const sources = parseArticleVideoSources(video.dataset.roofVideoSources);
  const figure = video.closest<HTMLElement>("figure.article-video");
  if (!figure || sources.length < 2 || figure.querySelector("[data-video-quality-ui]")) return () => {};

  const toolbar = document.createElement("div");
  toolbar.className = "article-video-toolbar";
  toolbar.dataset.videoQualityUi = "";

  const identity = document.createElement("span");
  identity.className = "article-video-identity";
  identity.textContent = "ROOF VIDEO";

  const control = document.createElement("label");
  control.className = "article-video-quality";
  const label = document.createElement("span");
  label.textContent = qualityLabel(video);
  const select = document.createElement("select");
  select.setAttribute("aria-label", qualityLabel(video));
  for (const source of sources) {
    const option = document.createElement("option");
    option.value = source.src;
    option.textContent = source.label;
    select.append(option);
  }
  const initial = sources.find((source) => source.src === video.currentSrc || source.src === video.src) ?? sources[0];
  select.value = initial.src;
  video.dataset.roofVideoQuality = initial.label;
  control.append(label, select);
  toolbar.append(identity, control);

  const caption = figure.querySelector("figcaption.article-video-caption");
  figure.insertBefore(toolbar, caption);

  const updateDuration = () => {
    const duration = formatDuration(video.duration);
    identity.textContent = duration ? `ROOF VIDEO · ${duration}` : "ROOF VIDEO";
  };
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) updateDuration();
  video.addEventListener("loadedmetadata", updateDuration);

  let confirmedSource: ArticleVideoSource = initial;
  let cancelPendingLoad = () => {};
  const loadSource = (
    source: ArticleVideoSource,
    onLoaded: () => void,
    onError: () => void
  ) => {
    cancelPendingLoad();
    const loaded = () => {
      cleanup();
      onLoaded();
    };
    const failed = () => {
      cleanup();
      onError();
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", loaded);
      video.removeEventListener("error", failed);
      cancelPendingLoad = () => {};
    };
    cancelPendingLoad = cleanup;
    video.addEventListener("loadedmetadata", loaded, { once: true });
    video.addEventListener("error", failed, { once: true });
    video.src = source.src;
    video.load();
  };

  const switchQuality = () => {
    const next = sources.find((source) => source.src === select.value);
    if (!next || next.src === video.currentSrc || next.src === video.src) return;
    const previous = confirmedSource;
    const currentTime = video.currentTime;
    const wasPaused = video.paused;
    const playbackRate = video.playbackRate;
    select.disabled = true;

    const restorePlayback = (source: ArticleVideoSource) => {
      video.currentTime = Math.min(currentTime, Number.isFinite(video.duration) ? video.duration : currentTime);
      video.playbackRate = playbackRate;
      video.dataset.roofVideoQuality = source.label;
      select.value = source.src;
      select.disabled = false;
      updateDuration();
      if (!wasPaused) void video.play().catch(() => {});
    };

    loadSource(next, () => {
      confirmedSource = next;
      restorePlayback(next);
    }, () => {
      select.value = previous.src;
      video.dataset.roofVideoQuality = previous.label;
      loadSource(previous, () => restorePlayback(previous), () => {
        select.disabled = false;
        updateDuration();
      });
    });
  };
  select.addEventListener("change", switchQuality);

  return () => {
    cancelPendingLoad();
    select.removeEventListener("change", switchQuality);
    video.removeEventListener("loadedmetadata", updateDuration);
    toolbar.remove();
  };
}
