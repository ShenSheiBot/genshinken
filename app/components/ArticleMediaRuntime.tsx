"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { enhanceArticleAudio } from "@/app/components/ArticleAudioRuntime";
import { enhanceArticleMusic } from "@/app/components/ArticleMusicRuntime";
import { enhanceArticleVideo } from "@/app/components/ArticleVideoRuntime";

export default function ArticleMediaRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const cleanups = [
      ...[...document.querySelectorAll<HTMLAudioElement>("audio.article-audio-native[data-roof-audio='r2']")]
        .map(enhanceArticleAudio),
      ...[...document.querySelectorAll<HTMLElement>("figure.article-music[data-roof-music='netease']")]
        .map(enhanceArticleMusic),
      ...[...document.querySelectorAll<HTMLVideoElement>("video.article-video-player[data-roof-video-sources]")]
        .map(enhanceArticleVideo),
    ];
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [pathname]);

  return null;
}
