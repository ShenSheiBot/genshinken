const SONG_ID = /^\d{1,12}$/u;

export function enhanceArticleMusic(card: HTMLElement): () => void {
  if (card.dataset.roofMusic !== "netease") return () => {};
  const songId = card.dataset.roofMusicId;
  const host = card.querySelector<HTMLElement>("[data-music-player]");
  if (!songId || !SONG_ID.test(songId) || !host || host.querySelector("iframe")) return () => {};

  const iframe = document.createElement("iframe");
  iframe.className = "article-music-iframe";
  iframe.src = `https://music.163.com/outchain/player?type=2&id=${songId}&auto=0&height=66`;
  iframe.title = card.getAttribute("aria-label") || "网易云音乐播放器";
  iframe.loading = "lazy";
  iframe.allow = "autoplay";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  host.prepend(iframe);
  host.dataset.musicEnhanced = "";

  return () => {
    delete host.dataset.musicEnhanced;
    iframe.remove();
  };
}
