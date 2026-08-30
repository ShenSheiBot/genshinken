"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { enhanceArticleAudio } from "@/app/components/ArticleAudioRuntime";
import { enhanceArticleMusic } from "@/app/components/ArticleMusicRuntime";
import { enhanceArticleVideo } from "@/app/components/ArticleVideoRuntime";

const MANAGED_NATIVE_MEDIA = [
  "audio.article-audio-native[data-roof-audio='r2']",
  "video.article-video-player",
].join(",");
const NETEASE_PLAYER = "iframe.article-music-iframe";

function isManagedNativeMedia(value: EventTarget | null): value is HTMLMediaElement {
  return value instanceof HTMLMediaElement && value.matches(MANAGED_NATIVE_MEDIA);
}

function focusedNetEasePlayer(): HTMLIFrameElement | null {
  const active = document.activeElement;
  return active instanceof HTMLIFrameElement && active.matches(NETEASE_PLAYER) ? active : null;
}

function resetNetEasePlayer(iframe: HTMLIFrameElement): void {
  const source = iframe.getAttribute("src");
  if (source) iframe.setAttribute("src", source);
}

function coordinateArticlePlayback(): () => void {
  let activeNetEasePlayer: HTMLIFrameElement | null = null;
  let lastFocusedNetEasePlayer: HTMLIFrameElement | null = null;

  const pauseNativeMedia = (except?: HTMLMediaElement) => {
    for (const media of document.querySelectorAll<HTMLMediaElement>(MANAGED_NATIVE_MEDIA)) {
      if (media !== except) media.pause();
    }
  };
  const nativePlay = (event: Event) => {
    if (!isManagedNativeMedia(event.target)) return;
    pauseNativeMedia(event.target);
    if (activeNetEasePlayer?.isConnected) resetNetEasePlayer(activeNetEasePlayer);
    activeNetEasePlayer = null;
  };
  const observeNetEaseFocus = () => {
    const focused = focusedNetEasePlayer();
    if (focused === lastFocusedNetEasePlayer) return;
    lastFocusedNetEasePlayer = focused;
    if (!focused) return;
    if (activeNetEasePlayer?.isConnected && activeNetEasePlayer !== focused) {
      resetNetEasePlayer(activeNetEasePlayer);
    }
    pauseNativeMedia();
    activeNetEasePlayer = focused;
  };

  document.addEventListener("play", nativePlay, true);
  const focusPoll = document.querySelector(NETEASE_PLAYER)
    ? window.setInterval(observeNetEaseFocus, 100)
    : undefined;

  return () => {
    document.removeEventListener("play", nativePlay, true);
    if (focusPoll !== undefined) window.clearInterval(focusPoll);
  };
}

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
    const stopPlaybackCoordination = coordinateArticlePlayback();
    return () => {
      stopPlaybackCoordination();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [pathname]);

  return null;
}
