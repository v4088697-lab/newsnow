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
