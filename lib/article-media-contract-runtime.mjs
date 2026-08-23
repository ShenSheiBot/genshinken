// Node's type-stripping resolver requires the explicit extension; production
// TypeScript imports continue to use lib/article-media-contract.ts directly.
export {
  isR2AudioCoverUrl,
  isR2AudioUrl,
  isR2VideoPosterUrl,
  isR2VideoUrl,
  isWechatAudioSource,
  isWechatVideoSource,
  neteaseSongIdFromTitle,
  neteaseSongIdFromUrl,
  parseArticleVideoSources,
} from "./article-media-contract.ts";
