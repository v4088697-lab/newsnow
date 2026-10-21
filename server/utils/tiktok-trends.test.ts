import { describe, expect, it } from "vitest"
import { parseTikTokTrends } from "./tiktok-trends"

describe("tikTok official trending hashtags", () => {
  it("preserves official rank, labels the region and period, and links to TikTok", () => {
    const items = parseTikTokTrends({
      BaseResp: { StatusCode: 0 },
      items: [
        { hashtagID: "2", hashtagName: "second", rankIndex: 2, publishCnt: 1200 },
        { hashtagID: "1", hashtagName: "first topic", rankIndex: 1 },
        { hashtagID: "2", hashtagName: "duplicate", rankIndex: 3 },
      ],
    })
    expect(items.map(item => item.title)).toEqual(["#first topic", "#second"])
    expect(items[0].url).toBe("https://www.tiktok.com/tag/first%20topic")
    expect(items[1].extra?.info).toBe("1,200 条视频 · 美国近 7 天")
  })

  it.each([
    {},
    { BaseResp: { StatusCode: 401 }, items: [] },
    { BaseResp: { StatusCode: 0 }, items: [] },
    { BaseResp: { StatusCode: 0 }, items: [{ hashtagID: "", hashtagName: "" }] },
  ])("rejects unavailable data without manufacturing trending content", (data) => {
    expect(() => parseTikTokTrends(data)).toThrow()
  })
})
