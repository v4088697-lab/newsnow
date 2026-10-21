import type { Source, SourceID } from "./types"

export const sourceReplacements: Record<string, SourceID> = {
  "36kr": "cnn",
  "36kr-quick": "cnn",
  "36kr-renqi": "cnn",
  "baidu": "reuters",
  "bilibili": "apnews",
  "bilibili-hot-search": "apnews",
  "bilibili-hot-video": "nytimes",
  "bilibili-ranking": "bbc",
  "chongbuluo": "guardian",
  "chongbuluo-latest": "guardian",
  "chongbuluo-hot": "guardian",
  "cls": "washingtonpost",
  "cls-telegraph": "washingtonpost",
  "cls-depth": "washingtonpost",
  "cls-hot": "washingtonpost",
  "coolapk": "wsj",
  "douban": "bloomberg",
  "douyin": "tiktok",
  "freebuf": "ft",
  "hupu": "euronews",
  "ifeng": "lemonde",
  "iqiyi": "youtube",
  "iqiyi-hot-ranklist": "youtube",
  "juejin": "instagram",
  "kuaishou": "facebook",
  "nowcoder": "dailymotion",
  "qqvideo": "rumble",
  "qqvideo-tv-hotsearch": "rumble",
  "sspai": "vimeo",
  "tencent": "twitch",
  "tencent-hot": "twitch",
  "thepaper": "kick",
  "tieba": "netflix",
  "toutiao": "disneyplus",
  "wallstreetcn": "hbomax",
  "wallstreetcn-quick": "hbomax",
  "wallstreetcn-news": "hbomax",
  "wallstreetcn-hot": "hbomax",
  "weibo": "hulu",
  "xueqiu": "x",
  "xueqiu-hotstock": "x",
  "zhihu": "quora",
}

// Keep replacements in their predecessors' positions in the default card list.
const sourceOrder: Record<string, string> = {
  cnn: "36kr-renqi",
  reuters: "baidu",
  apnews: "bilibili-hot-search",
  nytimes: "bilibili-hot-video",
  bbc: "bilibili-ranking",
  guardian: "chongbuluo-hot",
  washingtonpost: "cls-hot",
  wsj: "coolapk",
  bloomberg: "douban",
  tiktok: "douyin",
  ft: "freebuf",
  euronews: "hupu",
  lemonde: "ifeng",
  youtube: "iqiyi-hot-ranklist",
  instagram: "juejin",
  facebook: "kuaishou",
  dailymotion: "nowcoder",
  rumble: "qqvideo-tv-hotsearch",
  vimeo: "sspai",
  twitch: "tencent-hot",
  kick: "thepaper",
  netflix: "tieba",
  disneyplus: "toutiao",
  hbomax: "wallstreetcn-hot",
  hulu: "weibo",
  x: "xueqiu-hotstock",
  quora: "zhihu",
}

export function sourceSortKey(id: string) {
  return sourceOrder[id] ?? id
}

export function migrateSourceIds(ids: string[], available: Partial<Record<string, Source>>) {
  const resolved = ids.map(id => Object.prototype.hasOwnProperty.call(sourceReplacements, id) ? sourceReplacements[id] : id)
    .filter(id => Object.prototype.hasOwnProperty.call(available, id))
    .map(id => available[id]!.redirect ?? id)
  return [...new Set(resolved)] as SourceID[]
}
