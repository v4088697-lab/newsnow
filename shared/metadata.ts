import { sources } from "./sources"
import { sourceSortKey } from "./source-replacements"
import { typeSafeObjectEntries, typeSafeObjectFromEntries } from "./type.util"
import { updatedSourceIds as _updatedSourceIds } from "./updated-sources"
import type { ColumnID, HiddenColumnID, Metadata, SourceID } from "./types"

export const columns = {
  china: {
    zh: "国内",
    en: "China",
  },
  world: {
    zh: "国际",
    en: "World",
  },
  visual: {
    zh: "图文",
    en: "Visual Inspiration",
  },
  interests: {
    zh: "兴趣",
    en: "Interests",
  },
  music: {
    zh: "音乐",
    en: "Music",
  },
  ecommerce: {
    zh: "电商",
    en: "Shopping",
  },
  auctions: {
    zh: "二手拍卖",
    en: "Used & Auctions",
  },
  tech: {
    zh: "科技",
    en: "Technology",
  },
  finance: {
    zh: "财经",
    en: "Finance",
  },
  sports: {
    zh: "体育",
    en: "Sports",
  },
  focus: {
    zh: "关注",
    en: "Following",
  },
  realtime: {
    zh: "实时",
    en: "Live",
  },
  hottest: {
    zh: "最热",
    en: "Trending",
  },
  updated: {
    zh: "更新",
    en: "Updates",
  },
} as const

const updatedSourceIds = [..._updatedSourceIds] as SourceID[]

export const fixedColumnIds = ["focus", "hottest", "realtime", "updated"] as const satisfies Partial<ColumnID>[]
export const hiddenColumns = Object.keys(columns).filter(id => !fixedColumnIds.includes(id as any)) as HiddenColumnID[]

function getSortedSourceIds(type: "hottest" | "realtime") {
  return typeSafeObjectEntries(sources)
    .filter(([, v]) => v.type === type && !v.redirect)
    .map(([k]) => k)
    .sort((m, n) => sourceSortKey(m).localeCompare(sourceSortKey(n)))
}

export const metadata: Metadata = typeSafeObjectFromEntries(typeSafeObjectEntries(columns).map(([k, v]) => {
  switch (k) {
    case "focus":
      return [k, {
        name: v.en,
        sources: [] as SourceID[],
      }]
    case "hottest":
      return [k, {
        name: v.en,
        sources: getSortedSourceIds("hottest"),
      }]
    case "realtime":
      return [k, {
        name: v.en,
        sources: getSortedSourceIds("realtime"),
      }]
    case "updated":
      return [k, {
        name: v.en,
        sources: updatedSourceIds.filter(id => sources[id] && !sources[id].redirect),
      }]
    default:
      return [k, {
        name: v.en,
        sources: typeSafeObjectEntries(sources).filter(([, v]) => v.column === k && !v.redirect).map(([k]) => k),
      }]
  }
}))
