import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const postsDir = path.join(root, "source", "_posts");
const booksDir = path.join(root, "source", "_books");
const identityKeys = ["__biz", "mid", "idx", "sn"];

// Imported book chapters do not always retain a chapter-level citation in their
// merged Markdown document. These known aliases therefore live beside the
// validator instead of in an editor-maintained registry.
const chapterAliases = [
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247487595&idx=3&sn=bde1f69d14674ac3974aab410410996c",
    "sourceIds": [
      "CqOxlTszYLddoYrpg2F0gw",
      "uZB8at8nXnm31BLkFFPtQw",
      "9SvUwFy-SrBLaDw_nRL21Q",
      "O14RpCrXdLc_4HZbvBlCXA",
      "g8sLzhOD5JmbeLj4BDESuQ",
      "DAr8i0oGDH4duAMjJ2YwWg",
      "yU8d8hNjNqVw62ioSxbdsA",
      "XbmMk3QgrwzEmoLbgiPvTQ",
      "oz4ceXVKjQ105_l9I-xfgA",
      "U9WOPCKzThR0GEZCzcRO2Q"
    ],
    "canonicalPath": "/books/nippon-thought/chapters/chapter-01"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247486830&idx=1&sn=d624f211ec7eeeb4ebfcb327ba4ac1e0",
    "sourceIds": [
      "LIq_z1Nl6ACQHJRoiWsfzA"
    ],
    "canonicalPath": "/books/nippon-thought/chapters/chapter-08"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488987&idx=1&sn=0a82587227323740ec430217aa37537c",
    "sourceIds": [
      "bSU_qm-pxFGiiAI-V7F5MQ"
    ],
    "canonicalPath": "/posts/sekaikei-as-impossibility-sugii-hikaru"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488878&idx=1&sn=672fcc4c9944ced5ef07bb847d3fcb71",
    "sourceIds": [
      "-vn-bKx3EK-uodsIie2u9g"
    ],
    "canonicalPath": "/posts/blue-emoi-novels-roundtable"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488968&idx=2&sn=ca372de5d6d947461152c4f2fba3a5e7",
    "sourceIds": [
      "WsadxSDomgnjaW4b_7arWQ",
      "OUpfBb2vxSkL3Upv6ptWgg"
    ],
    "canonicalPath": "/posts/distant-view-everyday-k-on"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489021&idx=1&sn=8b8bd2f4536d4992325544abcb63f2cc",
    "sourceIds": [
      "wc6WnLM6m_fgmmm_zmMBxw"
    ],
    "canonicalPath": "/posts/hardcore-post-everyday-anime"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489169&idx=1&sn=64b7e62a0f7595c2832e4b7f5528bd91",
    "sourceIds": [
      "0eRI2opcbKCxGgfzwAnHMA"
    ],
    "canonicalPath": "/posts/suan-anime-spatiality"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489084&idx=1&sn=72346662bd7e51535599b1419a9acdd3",
    "sourceIds": [
      "MWe7abkKBzxX2PtHo-mliA"
    ],
    "canonicalPath": "/posts/what-is-japanese-bl-studies"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247487025&idx=1&sn=cf1051450e80414a6cc9eb9c86ed4ac9",
    "sourceIds": [
      "Hlf2M8H_xz3fNr2QYF_YAQ"
    ],
    "canonicalPath": "/books/character-novel-writing-method/chapters/lecture-01"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488530&idx=2&sn=00dd9f869205fc143ab0cc316320ae39",
    "sourceIds": [
      "re7Eh8TVb1YQl-fLPHF2OQ"
    ],
    "canonicalPath": "/posts/otsuka-world-and-variation-narrative-reproduction-consumption"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489004&idx=1&sn=f144011790496dc762d0cd034e474144",
    "sourceIds": [
      "9SObFN105D16HU6pSdrwZg"
    ],
    "canonicalPath": "/posts/embracing-the-flawed-kizumonogatari"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=MzkyNTMyMDE2NA==&mid=2247491224&idx=1&sn=4da28b5f43480b18db1470a4febb7269",
    "sourceIds": [
      "Osm1T34vW_XD3YKYDzgpOw"
    ],
    "canonicalPath": "/books/confronting-capital-and-empire/chapters/chapter-01-philosophy-answerability"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=MzkyNTMyMDE2NA==&mid=2247491229&idx=1&sn=3231e098cdd89f550d297b999db5aa29",
    "sourceIds": [
      "G1A4LMGQJ8EGBvcvMkGu8g"
    ],
    "canonicalPath": "/books/confronting-capital-and-empire/chapters/chapter-02-labor-process-historical-time"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=MzkyNTMyMDE2NA==&mid=2247491234&idx=1&sn=a058afc895ed36a9e1f0924c5c3ccd80",
    "sourceIds": [
      "TFE3O7DzFCa_wRkK0TmSfA"
    ],
    "canonicalPath": "/books/confronting-capital-and-empire/chapters/chapter-03-commodity-fetishism"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=MzkyNTMyMDE2NA==&mid=2247491253&idx=1&sn=ec5d468b2e57d11c1c0d76a58f597be2",
    "sourceIds": [
      "bPILC0RtiCv5V3mOY3kEew"
    ],
    "canonicalPath": "/books/confronting-capital-and-empire/chapters/chapter-04-nishida-antinomy"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=MzkyNTMyMDE2NA==&mid=2247491485&idx=1&sn=f86d86301013a4ee4e420605bcd1a703",
    "sourceIds": [
      "wAESgokp98z9MamzFCGEmQ"
    ],
    "canonicalPath": "/books/confronting-capital-and-empire/chapters/chapter-05-ethnicity-species"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=MzkyNTMyMDE2NA==&mid=2247491366&idx=1&sn=abfd12899719fe7198d0cd6d5c94be9a",
    "sourceIds": [
      "vZ6FtNQ9yx5q6bwsSVYz7A"
    ],
    "canonicalPath": "/books/confronting-capital-and-empire/chapters/chapter-06-aleatory-dialectic"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=MzkyNTMyMDE2NA==&mid=2247491435&idx=1&sn=91effad98396e13f02f6dc39622bd05e",
    "sourceIds": [
      "ED2a1Da6fGE_GpODuMuf-A"
    ],
    "canonicalPath": "/books/confronting-capital-and-empire/chapters/chapter-07-tanabe-storyteller"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=MzkyNTMyMDE2NA==&mid=2247492059&idx=1&sn=fac822f00682c0b46c1cdb41a19cdb36",
    "sourceIds": [
      "Q1aksRvxSgHOrMJPe5uOrQ"
    ],
    "canonicalPath": "/books/confronting-capital-and-empire/chapters/chapter-08-subjective-drive"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=MzkyNTMyMDE2NA==&mid=2247491372&idx=1&sn=d1a178f65135db37b8aaeeb6a06d3fc9",
    "sourceIds": [
      "iYoVj0TRlBDCjy4LGHvdtA"
    ],
    "canonicalPath": "/books/confronting-capital-and-empire/chapters/chapter-09-umemoto-nothingness"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=MzkyNTMyMDE2NA==&mid=2247491381&idx=1&sn=c2c7f523bcf6b93fc1ee60609c848ab3",
    "sourceIds": [
      "EmcatbI58HW7XMIVqyROgg"
    ],
    "canonicalPath": "/books/confronting-capital-and-empire/chapters/chapter-10-afternoon-rest"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=MzkyNTMyMDE2NA==&mid=2247491419&idx=1&sn=acc5fc6105b47280ea5b1992dd9b5ca4",
    "sourceIds": [
      "XcHajx3IGwuAwij1C9Movg"
    ],
    "canonicalPath": "/books/confronting-capital-and-empire/chapters/chapter-11-yanagida-negation"
  },
  {
    "legacyUrl": "https://mp.weixin.qq.com/s?__biz=MzkyNTMyMDE2NA==&mid=2247491361&idx=1&sn=75af05bb712476afa8fbaa63ee65a377",
    "sourceIds": [
      "CVdsnEa83xASHeY6I1Ft-g"
    ],
    "canonicalPath": "/books/confronting-capital-and-empire/chapters/chapter-12-tosaka-secret-history"
  }
];

// Published articles retain a few legacy WeChat spellings that are not present
// in their reader-facing citations. Keep those routing facts beside the
// validator; do not require editors to maintain a crawl inventory.
const archivedSourceAliases = `
/posts/liz-blue-bird-sound-music-narrative	https://mp.weixin.qq.com/s/-j1TGu6g6ZeKmMBM6z8_nw
/posts/liz-blue-bird-sound-music-narrative	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488888&idx=1&sn=3a4b4a4d22052376804c18224b63acc9
/posts/sugii-hikaru-light-novel-literary-prize	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489389&idx=1&sn=2174a1049c546d4c8c9e29b759108b83
/posts/choo-hyperbolic-nationalism-korean-animation	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489285&idx=1&sn=9ce0aab0c3d17eb837fdef42c15984e8
/posts/erotophobia-colonization-queers-nature	https://mp.weixin.qq.com/s/0hmUFNwqPKG5AVdj1DI7XQ
/posts/erotophobia-colonization-queers-nature	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489540&idx=2&sn=ba48c9f78f72c5481c0621ef63ba7dbf
/posts/liz-and-the-blue-bird-unconscious-animation	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489037&idx=1&sn=b4979fc0b652c9ce9730d76a5ea4638e
/posts/sekaikei-syndrome-music-interview	https://mp.weixin.qq.com/s/3dY9tpwfRhpU8_xlyuPEgw
/posts/sekaikei-syndrome-music-interview	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489686&idx=1&sn=016fa2db881f41583cba053a2dccb502
/posts/feminism-rebellion-nature-1981	https://mp.weixin.qq.com/s/6D_4L4BsFzs-zAHHUYi8VA
/posts/feminism-rebellion-nature-1981	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488032&idx=1&sn=59597453f24974c8f86107f500bc76f9
/posts/sousa-weebwave-2010s-music-videos	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489230&idx=1&sn=7701cf7bbb3c0e3e3f7ab6dd1a65d8d6
/posts/beauvoir-butler-feminist-thought	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488144&idx=1&sn=7965b153d0066c01ce297d71f45c2196
/posts/colonial-film-time-shinkai	https://mp.weixin.qq.com/s/701WNiZMyw2lJi7Apx5xEQ
/posts/colonial-film-time-shinkai	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488907&idx=1&sn=22465cb9d5235fa3680e8edd8e5ca49c
/posts/trinh-minh-ha-infinite-layers-third-world	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247487827&idx=1&sn=7119f97fe494d451d3b987eae5512d34
/posts/conjoined-by-hand-aesthetic-materiality	https://mp.weixin.qq.com/s/8kVJpnRRQkmr5G5GXNMHtw
/posts/conjoined-by-hand-aesthetic-materiality	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489556&idx=1&sn=3d7bce473c11905ef121f8ab0ddc9431
/posts/interview-shinkai-ex-boyfriend	https://mp.weixin.qq.com/s/8nnpwDIRaJORQXO4gxfxsg
/posts/interview-shinkai-ex-boyfriend	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488856&idx=1&sn=7454cc9efb063da2583fdd92a1cabbf6
/posts/animals-in-database-flying-takahiro	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489024&idx=1&sn=cc4cc6337a1b9801f01274bced70abd8
/posts/akagi-tomohiro-maruyama-war	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489352&idx=1&sn=723fe1d0a51983194dceaff5952446ed
/posts/lesbian-love-womanhood	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489540&idx=4&sn=065127bc7efd5bf9349d203377369b64
/posts/decolonising-anime-studies-prolegomenon	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489457&idx=1&sn=aeb5c68cf412d2b379e79c8078c2ee2a
/posts/japan-00s-anime-criticism-podcast	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489058&idx=1&sn=9433ccd5eea673ff3ffd55e046f0b851
/posts/gundam-pacific-war-war-trauma	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489240&idx=1&sn=83b3ffe3a47fd4d7c26f082df9a7dd60
/posts/stevie-suan-globalization-world-system-anime	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489494&idx=1&sn=d18fabe3a78a43fd7d516a06be014712
/posts/japanese-animation-media-ecology	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489578&idx=1&sn=77ca7d2d3aa02823f18c327963aab560
/posts/silent-vampire-kizumonogatari	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489052&idx=1&sn=8118ba23eadf74366fb930380b234c5a
/posts/evolution-of-bl-playing-with-gender	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489540&idx=3&sn=d4928add0db6087674b189b899c99633
/posts/takeuchi-yoshimi-displacing-method-interview	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489659&idx=1&sn=bd91f40f7e8e8740670a9cc28d7f6945
/posts/feminist-concepts-work	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489030&idx=2&sn=286e9a7adbf6f80c9ba098c995d3fb5d
/posts/anime-machine-roundtable	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489450&idx=1&sn=cb735f0d712f71d5571bca8e80f98fd6
/posts/comedy-of-birth-k-on-everyday-anime	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488968&idx=1&sn=42ebbfcefb8cd4481ed2a0ef18e73d91
/posts/lamarre-otaku-movement-2006-a	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489264&idx=1&sn=886bc7231c9b949737c81e5e49576498
/posts/karatani-marx-shadow-trier	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489395&idx=1&sn=1e213cee8e8f71e25a6b30502d99ae53
/posts/feminism-five-thousand-word-guide	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488930&idx=2&sn=209284dafd20244f55ef4ec271012bd0
/posts/hiroshi-nagasaki-rebellion-theory	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488976&idx=1&sn=a4ab64ec8b56aa0c483c69486bdfc54b
/posts/girls-band-cry-middle-finger	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488785&idx=1&sn=9f38c90374609056bbba6d37735db4d3
/posts/matsuda-japanese-criticism-space	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489212&idx=1&sn=66c0aa86e2793c91f51c25fcae4baff0
/posts/otsuka-otaku-conversion-literature	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489318&idx=1&sn=ba38e1eb32e3678e3b7b60e6402e42a3
/posts/1984-tokyo-commuter-subculture-otaku	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488898&idx=1&sn=4b6e25c50ca8d020d122bf699f725ac4
/posts/feminist-concepts-sex	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489064&idx=2&sn=7d1737e424212ec0468bb0129cba095f
/posts/frederick-douglass-womens-suffrage-1888	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247487943&idx=1&sn=950e9e81c89e9a9d8917d3cc00814f91
/posts/steinberg-character-world-consumption	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489343&idx=1&sn=78ef582ef26ee2a670acacc08e734776
/posts/living-between-infrastructures-commuter-networks-revised	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489568&idx=1&sn=65b03c5ae44c04bc69d094b5eba8e1a6
/posts/sailor-antifa-radical-cosplay	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489117&idx=1&sn=d1323c33631b722760351ec43beb8c27
/posts/karatani-critique-space-asada-aki	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489139&idx=1&sn=18cdf4ffe357bb30a8a5ca1e9a90525f
/posts/specificity-and-future-of-japanese-animation	https://mp.weixin.qq.com/s/MQOhcwMrFNR8MDkVCjedBg
/posts/specificity-and-future-of-japanese-animation	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489014&idx=1&sn=826e19a3dce54ca90388191134125e63
/posts/azuma-hiroki-what-is-criticism	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489470&idx=1&sn=aeac96150283bd13b2e3b02ade941b84
/posts/mori-minoru-day-of-resurrection	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489657&idx=1&sn=19cfa1e01b7efc1bbd936fb7ee9e25bd
/posts/my-brilliant-friend-naples-quartet	https://mp.weixin.qq.com/s/oBdogk94BYbrN2hIGDWBcw
/posts/my-brilliant-friend-naples-quartet	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488930&idx=1&sn=90c787274913bce34a3e53b062326d05
/posts/manga-signal-of-noise	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489378&idx=1&sn=d68cb49560a372321bbf7ca720a560ac
/posts/skincare-guide-for-trans-people	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489616&idx=1&sn=806cb6320df4a07f0ed4add674a26ee1
/posts/roof-genshiken-reader-group-summer-2024	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488782&idx=2&sn=74453a6035f5c5e9c8d1348942573486
/posts/faust-east-asia-otaku-transversality	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489156&idx=1&sn=d783a43f20eba2821e1ce670ceba85fa
/posts/metonymy-redemption-nagasaki-kyoto-animation-your-color	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489614&idx=1&sn=fe2e5df4ad70f9aa8ee0d807f6751582
/posts/erotic-idol-female-oriented-av-men	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489064&idx=1&sn=4c36ebb09a99924303a32e1a070adb22
/posts/recrossing-00s-criticism	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489100&idx=1&sn=21bffcf2a1e5095543e87e0c2d150e02
/posts/rethink-everyday	https://mp.weixin.qq.com/s/TaKTNEhIVG31NUGq28rulQ
/posts/rethink-everyday	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489686&idx=2&sn=4d177a92d18dc23c9f4f6698f2e20493
/posts/asada-akira-bts-radio-sakamoto	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489139&idx=2&sn=30226511fe2908066df59ec409147cda
/posts/fujitsu-ryota-porco-rosso-patlabor-2	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489507&idx=1&sn=03f84e39d61c428a9ad7adb69bd8b844
/posts/yuri-genre-formation-process	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489417&idx=1&sn=a1ed1ce1fedd044be072f47a2cc6b1ea
/posts/animation-and-animism	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489637&idx=1&sn=4df3d05aa20570941f68d568709396b3
/posts/otsuka-eiji-literature-bad-debt	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489328&idx=1&sn=c6614a5ef6b9e50a82f65adb7da4309d
/posts/kizumonogatari-architecture-landscape	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489677&idx=1&sn=fbf19adc61e3a79482edbe3241d58e95
/posts/feminist-theory-modernity-postmodernity	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489540&idx=5&sn=751b28e720f30f2a4769773903b379be
/posts/thomas-lamarre-manga-bomb-barefoot-gen	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489637&idx=3&sn=6fb69da507abdc98c54439fc262e723e
/posts/free-humanities-video-courses-2024	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488790&idx=1&sn=d15b87c157ec811cb7741cefcf87440a
/posts/mohanty-western-eyes-feminist-scholarship	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488338&idx=1&sn=ca4732ef4a09f8f23ec955d4c5fd5e47
/posts/osugi-shigeo-peace-and-stupidity	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489540&idx=1&sn=4f988de0be34c32baf92cb486036d907
/posts/nichijo-anime-kyoto-animation-bocchi	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489530&idx=1&sn=5607d3aae858d1bfca9ad71c1f117648
/posts/karatani-why-i-quit-literature	https://mp.weixin.qq.com/s/zl6RQfs3ZMAQPbqgIGeCfw
/posts/karatani-why-i-quit-literature	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489102&idx=1&sn=0ee6251c255c21c95b4d452520d10643
/posts/kimura-1959-generation-toei-animation	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489182&idx=1&sn=fb38cf2e52b5bd0bea488b2413a3172c
/books/nippon-thought/chapters/chapter-01	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247486494&idx=7&sn=d56d6f846cc310c57cc0ecb02ff95900
/books/nippon-thought/chapters/chapter-01	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247486468&idx=7&sn=12f4e837dd4347631004f7afc31e70a0
/books/nippon-thought/chapters/chapter-01	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247486354&idx=7&sn=25dc9c2768994c04425b1ed3a269c8f9
/books/nippon-thought/chapters/chapter-01	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247486305&idx=6&sn=b24d755a0b6a9cd42bf9d7d4929c04a2
/books/nippon-thought/chapters/chapter-01	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247486298&idx=5&sn=fb2a87e68c4a85f48632d6445316adcb
/books/nippon-thought/chapters/chapter-01	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247486243&idx=4&sn=cdf97cd06443e3608ceb9dec12f52332
/books/nippon-thought/chapters/chapter-01	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247486235&idx=3&sn=ae07bbbb50dd47f3048faea159b06d92
/books/nippon-thought/chapters/chapter-01	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247486222&idx=2&sn=df494a3d577d7208ac2f06b6d9e7b16d
/books/nippon-thought/chapters/chapter-01	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247486171&idx=1&sn=d5d8622abaf9ef73faabec45bac39f40
/posts/distant-view-everyday-k-on	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247488924&idx=1&sn=d1e4019b2890b708362cb44abf34ac64
/books/confronting-capital-and-empire/chapters/chapter-01-philosophy-answerability	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489619&idx=2&sn=d6711c2d10e2da7134ca79d4e80200ad
/books/confronting-capital-and-empire/chapters/chapter-02-labor-process-historical-time	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489619&idx=3&sn=f90d72edb88cd08e591f8dd93f11ee70
/books/confronting-capital-and-empire/chapters/chapter-03-commodity-fetishism	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489619&idx=4&sn=ffcd1d0856c4e1eda4cc6684c655906e
/books/confronting-capital-and-empire/chapters/chapter-04-nishida-antinomy	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489619&idx=5&sn=ad2aabf67cc2ee2854192181148e9b67
/books/confronting-capital-and-empire/chapters/chapter-05-ethnicity-species	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489619&idx=6&sn=34f7e2aac5f39a17d7f341ebc0b025d0
/books/confronting-capital-and-empire/chapters/chapter-06-aleatory-dialectic	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489619&idx=7&sn=6304a2f6712e3edc94910fdb84b97d29
/books/confronting-capital-and-empire/chapters/chapter-07-tanabe-storyteller	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489619&idx=8&sn=638f39f715c2b92e16a0ad40f64b6459
/books/confronting-capital-and-empire/chapters/chapter-08-subjective-drive	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489621&idx=1&sn=6c9a2de082e226e3481c9de906e2f4eb
/books/confronting-capital-and-empire/chapters/chapter-09-umemoto-nothingness	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489621&idx=2&sn=a0cca70b810b2201386827829a795caa
/books/confronting-capital-and-empire/chapters/chapter-10-afternoon-rest	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489621&idx=3&sn=6da55e1aee0bb26eae9368a71b9672bf
/books/confronting-capital-and-empire/chapters/chapter-11-yanagida-negation	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489621&idx=4&sn=c49dd2c3a0097f7a6095280036a0a1d9
/books/confronting-capital-and-empire/chapters/chapter-12-tosaka-secret-history	https://mp.weixin.qq.com/s?__biz=Mzg5MjAwMDM0Ng==&mid=2247489621&idx=5&sn=e299148d9ead512ba5ad5d1bf653c861
`.trim().split("\n").map((line) => {
  const [canonicalPath, legacyUrl] = line.split("\t");
  return { canonicalPath, legacyUrl };
});

function normalizeWechatUrl(rawUrl) {
  const decoded = rawUrl.replaceAll("&amp;", "&");
  let url;
  try {
    url = new URL(decoded);
  } catch {
    return null;
  }
  if (url.hostname !== "mp.weixin.qq.com") return null;
  if (/^\/s\/[A-Za-z0-9_-]+$/.test(url.pathname)) return `${url.origin}${url.pathname}`;
  const identity = identityKeys
    .map((key) => [key, url.searchParams.get(key)])
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return identity ? `${url.origin}${url.pathname}?${identity}` : `${url.origin}${url.pathname}`;
}

function lineNumber(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

const failures = [];
const knownLegacy = new Map();
const publishedRoutes = new Set();
const postBodies = [];
const bookPathByDocumentSlug = new Map();

for (const name of fs.readdirSync(booksDir).filter((entry) => entry.endsWith(".json"))) {
  const book = JSON.parse(fs.readFileSync(path.join(booksDir, name), "utf8"));
  const bookSlug = book.slug ?? name.slice(0, -5);
  const bookPath = `/books/${bookSlug}`;
  publishedRoutes.add(bookPath);
  if (book.documentSlug) bookPathByDocumentSlug.set(book.documentSlug, bookPath);
  const visit = (nodes = []) => {
    for (const node of nodes) {
      if (node.status === "published" && node.id) {
        publishedRoutes.add(`/books/${bookSlug}/chapters/${node.id}`);
      }
      visit(node.children);
      visit(node.chapters);
    }
  };
  visit(book.chapters);
  visit(book.parts);
}

function registerLegacy(rawUrl, canonicalPath, source) {
  const identity = normalizeWechatUrl(rawUrl);
  if (!identity) return;
  const previous = knownLegacy.get(identity);
  if (previous && previous !== canonicalPath) {
    failures.push(`${source}: conflicting canonical paths for ${identity}`);
    return;
  }
  knownLegacy.set(identity, canonicalPath);
}

for (const name of fs.readdirSync(postsDir).filter((entry) => entry.endsWith(".md"))) {
  const source = fs.readFileSync(path.join(postsDir, name), "utf8");
  const parsed = matter(source);
  const slug = name.slice(0, -3);
  const canonicalPath = parsed.data.book_document
    ? bookPathByDocumentSlug.get(slug)
    : `/posts/${slug}`;
  if (canonicalPath) {
    publishedRoutes.add(canonicalPath);
    const citationUrls = [parsed.data.citation?.url, ...(parsed.data.citations ?? []).map((item) => item?.url)];
    for (const url of citationUrls) {
      if (typeof url === "string") registerLegacy(url, canonicalPath, `source/_posts/${name}`);
    }
  }
  postBodies.push({ name, body: parsed.content });
}

for (const entry of chapterAliases) {
  if (!publishedRoutes.has(entry.canonicalPath)) {
    failures.push(`chapter alias points to an unpublished route: ${entry.canonicalPath}`);
    continue;
  }
  registerLegacy(entry.legacyUrl, entry.canonicalPath, "chapterAliases");
  for (const sourceId of entry.sourceIds ?? []) {
    registerLegacy(`https://mp.weixin.qq.com/s/${sourceId}`, entry.canonicalPath, "chapterAliases");
  }
}

for (const entry of archivedSourceAliases) {
  if (!publishedRoutes.has(entry.canonicalPath)) {
    failures.push(`archived source alias points to an unpublished route: ${entry.canonicalPath}`);
    continue;
  }
  registerLegacy(entry.legacyUrl, entry.canonicalPath, "archivedSourceAliases");
}

const markdownLink = /\[[^\]]*\]\((https?:\/\/mp\.weixin\.qq\.com\/[^)\s]+)\)/g;
const htmlLink = /href=["'](https?:\/\/mp\.weixin\.qq\.com\/[^"']+)["']/g;
for (const { name, body } of postBodies) {
  for (const pattern of [markdownLink, htmlLink]) {
    pattern.lastIndex = 0;
    for (const match of body.matchAll(pattern)) {
      const identity = normalizeWechatUrl(match[1]);
      const canonicalPath = identity ? knownLegacy.get(identity) : null;
      if (canonicalPath) {
        failures.push(
          `source/_posts/${name}:${lineNumber(body, match.index)} still links to WeChat; use ${canonicalPath}`,
        );
      }
    }
  }
}

if (failures.length) {
  console.error(`Internal-link canonicalization failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Internal-link canonicalization passed (${knownLegacy.size} known source routes; ${publishedRoutes.size} public routes).`,
);
