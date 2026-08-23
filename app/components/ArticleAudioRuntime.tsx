import { isR2AudioUrl } from "@/lib/article-media-contract";

type AudioLabels = {
  back: string;
  forward: string;
  pause: string;
  play: string;
  progress: string;
  speed: string;
};

function labelsFor(audio: HTMLAudioElement): AudioLabels {
  const lang = (audio.closest<HTMLElement>("[lang]")?.lang || document.documentElement.lang).toLowerCase();
  if (lang.startsWith("en")) {
    return { back: "Back 15 seconds", forward: "Forward 15 seconds", pause: "Pause", play: "Play", progress: "Episode progress", speed: "Speed" };
  }
  if (lang.startsWith("ja")) {
    return { back: "15秒戻る", forward: "15秒進む", pause: "一時停止", play: "再生", progress: "再生位置", speed: "速度" };
  }
  if (lang.includes("hant")) {
    return { back: "後退15秒", forward: "前進15秒", pause: "暫停", play: "播放", progress: "節目進度", speed: "速度" };
  }
  return { back: "后退15秒", forward: "前进15秒", pause: "暂停", play: "播放", progress: "节目进度", speed: "速度" };
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const seconds = Math.floor(value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function button(className: string, text: string, label: string): HTMLButtonElement {
  const control = document.createElement("button");
  control.type = "button";
  control.className = className;
  control.textContent = text;
  control.setAttribute("aria-label", label);
  return control;
}

export function enhanceArticleAudio(audio: HTMLAudioElement): () => void {
  if (!isR2AudioUrl(audio.currentSrc || audio.src)) return () => {};
  const body = audio.closest<HTMLElement>(".article-audio-body");
  if (!body || body.querySelector("[data-audio-transport]")) return () => {};

  const labels = labelsFor(audio);
  const expectedDuration = Number(audio.dataset.roofAudioDuration) || 0;
  const nativeFallback = {
    ariaHidden: audio.getAttribute("aria-hidden"),
    controls: audio.controls,
    hidden: audio.hidden,
    inert: audio.inert,
    tabIndex: audio.getAttribute("tabindex"),
  };
  const transport = document.createElement("div");
  transport.className = "article-audio-transport";
  transport.dataset.audioTransport = "";

  const controls = document.createElement("div");
  controls.className = "article-audio-controls";
  const back = button("article-audio-skip", "−15", labels.back);
  const play = button("article-audio-play", "▶", labels.play);
  const forward = button("article-audio-skip", "+15", labels.forward);
  controls.append(back, play, forward);

  const timeline = document.createElement("div");
  timeline.className = "article-audio-timeline";
  const current = document.createElement("time");
  current.className = "article-audio-time";
  current.textContent = "00:00";
  const progress = document.createElement("input");
  progress.className = "article-audio-progress";
  progress.type = "range";
  progress.min = "0";
  progress.max = String(expectedDuration || 1);
  progress.step = "0.1";
  progress.value = "0";
  progress.setAttribute("aria-label", labels.progress);
  const total = document.createElement("time");
  total.className = "article-audio-time article-audio-time-total";
  total.textContent = formatTime(expectedDuration);
  timeline.append(current, progress, total);

  const speedLabel = document.createElement("label");
  speedLabel.className = "article-audio-speed";
  const speedText = document.createElement("span");
  speedText.textContent = labels.speed;
  const speed = document.createElement("select");
  speed.setAttribute("aria-label", labels.speed);
  for (const rate of [0.75, 1, 1.25, 1.5, 2]) {
    const option = document.createElement("option");
    option.value = String(rate);
    option.textContent = `${rate}×`;
    if (rate === 1) option.selected = true;
    speed.append(option);
  }
  speedLabel.append(speedText, speed);

  const row = document.createElement("div");
  row.className = "article-audio-transport-row";
  row.append(controls, speedLabel);
  transport.append(row, timeline);
  body.insertBefore(transport, audio);
  body.dataset.audioEnhanced = "";
  audio.controls = false;
  audio.hidden = true;
  audio.inert = true;
  audio.tabIndex = -1;
  audio.setAttribute("aria-hidden", "true");

  const duration = () => Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : expectedDuration;
  const update = () => {
    const maximum = duration() || 1;
    progress.max = String(maximum);
    progress.value = String(Math.min(audio.currentTime, maximum));
    progress.style.setProperty("--audio-progress", `${Math.min(100, (audio.currentTime / maximum) * 100)}%`);
    current.textContent = formatTime(audio.currentTime);
    total.textContent = formatTime(maximum);
    play.textContent = audio.paused ? "▶" : "Ⅱ";
    play.setAttribute("aria-label", audio.paused ? labels.play : labels.pause);
  };
  const toggle = () => {
    if (audio.paused) void audio.play().catch(() => {});
    else audio.pause();
  };
  const skipBack = () => { audio.currentTime = Math.max(0, audio.currentTime - 15); };
  const skipForward = () => { audio.currentTime = Math.min(duration() || audio.currentTime + 15, audio.currentTime + 15); };
  const seek = () => { audio.currentTime = Number(progress.value); };
  const changeSpeed = () => { audio.playbackRate = Number(speed.value); };

  play.addEventListener("click", toggle);
  back.addEventListener("click", skipBack);
  forward.addEventListener("click", skipForward);
  progress.addEventListener("input", seek);
  speed.addEventListener("change", changeSpeed);
  for (const event of ["loadedmetadata", "durationchange", "timeupdate", "play", "pause", "ended", "ratechange"]) {
    audio.addEventListener(event, update);
  }
  update();

  return () => {
    play.removeEventListener("click", toggle);
    back.removeEventListener("click", skipBack);
    forward.removeEventListener("click", skipForward);
    progress.removeEventListener("input", seek);
    speed.removeEventListener("change", changeSpeed);
    for (const event of ["loadedmetadata", "durationchange", "timeupdate", "play", "pause", "ended", "ratechange"]) {
      audio.removeEventListener(event, update);
    }
    delete body.dataset.audioEnhanced;
    audio.controls = nativeFallback.controls;
    audio.hidden = nativeFallback.hidden;
    audio.inert = nativeFallback.inert;
    if (nativeFallback.tabIndex === null) audio.removeAttribute("tabindex");
    else audio.setAttribute("tabindex", nativeFallback.tabIndex);
    if (nativeFallback.ariaHidden === null) audio.removeAttribute("aria-hidden");
    else audio.setAttribute("aria-hidden", nativeFallback.ariaHidden);
    transport.remove();
  };
}
