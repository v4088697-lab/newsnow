import { describe, expect, it } from "vitest"
import { genSources } from "../shared/pre-sources"
import { migrateSourceIds, sourceReplacements, sourceSortKey } from "../shared/source-replacements"

const sources = genSources()

describe("international source replacements", () => {
  it("registers all 11 new sources and removes the replaced providers", () => {
    const replacements = [...new Set(Object.values(sourceReplacements))]
    expect(replacements).toHaveLength(11)
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
      .toEqual(["cnn", "zhihu", "nytimes", "washingtonpost"])
  })

  it("keeps the replacement cards in the previous default order", () => {
    const ids = ["tiktok", "ft", "cnn", "reuters", "apnews", "nytimes", "bbc", "guardian", "washingtonpost", "wsj", "bloomberg"]
    expect(ids.sort((a, b) => sourceSortKey(a).localeCompare(sourceSortKey(b))))
      .toEqual(["cnn", "reuters", "apnews", "nytimes", "bbc", "guardian", "washingtonpost", "wsj", "bloomberg", "tiktok", "ft"])
  })
})
