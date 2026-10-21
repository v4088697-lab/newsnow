import { describe, expect, it } from "vitest"
import { genSources } from "../shared/pre-sources"
import { migrateSourceIds, sourceReplacements, sourceSortKey } from "../shared/source-replacements"

const sources = genSources()

describe("international source replacements", () => {
  it("registers all 27 replacement sources and removes the replaced providers", () => {
    const replacements = [...new Set(Object.values(sourceReplacements))]
    expect(replacements).toHaveLength(27)
    for (const id of replacements) {
      expect(sources[id]).toBeDefined()
      expect(sources[id].disable).toBeUndefined()
    }
    for (const id of Object.keys(sourceReplacements)) expect(Object.prototype.hasOwnProperty.call(sources, id)).toBe(false)
  })

  it("migrates every old source to the specified media outlet", () => {
    for (const [oldId, newId] of Object.entries(sourceReplacements)) {
      expect(migrateSourceIds([oldId], sources)).toEqual([newId])
    }
  })

  it("preserves favorite order and removes merged duplicates without losing unrelated sources", () => {
    expect(migrateSourceIds(["36kr-renqi", "zhihu", "36kr-quick", "bilibili-hot-video", "nytimes", "cls-hot", "cls-depth", "missing", "constructor"], sources))
      .toEqual(["cnn", "quora", "nytimes", "washingtonpost"])
  })

  it("migrates all platform sub-sources without retaining old identities", () => {
    expect(migrateSourceIds(["hupu", "ifeng", "iqiyi-hot-ranklist", "juejin", "kuaishou", "nowcoder", "qqvideo-tv-hotsearch", "sspai", "tencent-hot", "thepaper", "tieba", "toutiao", "wallstreetcn-quick", "wallstreetcn-hot", "weibo", "xueqiu-hotstock", "zhihu"], sources))
      .toEqual(["euronews", "lemonde", "youtube", "instagram", "facebook", "dailymotion", "rumble", "vimeo", "twitch", "kick", "netflix", "disneyplus", "paramountplus", "peacock", "x", "quora"])
  })

  it("keeps the replacement cards in the previous default order", () => {
    const ids = ["tiktok", "ft", "cnn", "reuters", "apnews", "nytimes", "bbc", "guardian", "washingtonpost", "wsj", "bloomberg"]
    expect(ids.sort((a, b) => sourceSortKey(a).localeCompare(sourceSortKey(b))))
      .toEqual(["cnn", "reuters", "apnews", "nytimes", "bbc", "guardian", "washingtonpost", "wsj", "bloomberg", "tiktok", "ft"])
  })

  it("migrates both generations of streaming favorites and preserves card positions", () => {
    expect(migrateSourceIds(["hbomax", "paramountplus", "wallstreetcn-hot", "hulu", "weibo", "peacock"], sources))
      .toEqual(["paramountplus", "peacock"])
    expect(sourceSortKey("paramountplus")).toBe("wallstreetcn-hot")
    expect(sourceSortKey("peacock")).toBe("weibo")
  })
})
