export type ArticleVideoSource = {
  label: string;
  width: number;
  height: number;
  src: string;
};

const R2_AUDIO_URL = /^https:\/\/assets\.labonroof\.top\/wechat-audio\/(?:[A-Za-z0-9_-]+\/)+original(?:-[A-Za-z0-9_-]+)?\.mp3$/u;
const R2_AUDIO_COVER_URL = /^https:\/\/assets\.labonroof\.top\/wechat-audio\/(?:[A-Za-z0-9_-]+\/)+(?:cover|poster)-[A-Za-z0-9_-]*\d+x\d+[A-Za-z0-9_-]*\.jpg$/u;
const R2_VIDEO_URL = /^https:\/\/assets\.labonroof\.top\/wechat-video\/(?:[A-Za-z0-9_-]+\/)+[A-Za-z0-9_-]+\.mp4$/u;
const R2_VIDEO_POSTER_URL = /^https:\/\/assets\.labonroof\.top\/wechat-video\/(?:[A-Za-z0-9_-]+\/)+[A-Za-z0-9_-]+\.jpg$/u;
const WECHAT_AUDIO_SOURCE = /^\/?attachments\/wechat-audio\/(?:[A-Za-z0-9_-]+\/)+original(?:-[A-Za-z0-9_-]+)?\.mp3$/u;
const WECHAT_VIDEO_SOURCE = /^\/?attachments\/wechat-video\/(?:[A-Za-z0-9_-]+\/)+[A-Za-z0-9_-]+\.mp4$/u;
const NETEASE_SONG_URL = /^https:\/\/music\.163\.com\/#\/song\?id=(\d{1,12})$/u;
const NETEASE_SONG_TITLE = /^netease:(\d{1,12})$/u;
const VIDEO_QUALITY_LABEL = /^\d{3,4}P$/u;

export function isR2AudioUrl(value: string): boolean {
  return R2_AUDIO_URL.test(value);
}

export function isR2AudioCoverUrl(value: string): boolean {
  return R2_AUDIO_COVER_URL.test(value);
}

export function isR2VideoUrl(value: string): boolean {
  return R2_VIDEO_URL.test(value);
}

export function isR2VideoPosterUrl(value: string): boolean {
  return R2_VIDEO_POSTER_URL.test(value);
}

export function isWechatAudioSource(value: string): boolean {
  return WECHAT_AUDIO_SOURCE.test(value);
}

export function isWechatVideoSource(value: string): boolean {
  return WECHAT_VIDEO_SOURCE.test(value);
}

export function neteaseSongIdFromUrl(value: string): string | undefined {
  return NETEASE_SONG_URL.exec(value)?.[1];
}

export function neteaseSongIdFromTitle(value: string): string | undefined {
  return NETEASE_SONG_TITLE.exec(value)?.[1];
}

export function parseArticleVideoSources(raw: string | undefined): ArticleVideoSource[] {
  if (!raw) return [];
  try {
    const sources = JSON.parse(raw) as unknown;
    if (!Array.isArray(sources) || sources.length < 2 || sources.length > 4) return [];
    return sources.every((source) => {
      if (!source || typeof source !== "object") return false;
      const candidate = source as Record<string, unknown>;
      return typeof candidate.label === "string"
        && VIDEO_QUALITY_LABEL.test(candidate.label)
        && Number.isInteger(candidate.width)
        && Number.isInteger(candidate.height)
        && Number(candidate.width) > 0
        && Number(candidate.height) > 0
        && typeof candidate.src === "string"
        && isR2VideoUrl(candidate.src);
    }) ? sources as ArticleVideoSource[] : [];
  } catch {
    return [];
  }
}
