import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { genSources } from "../shared/pre-sources"
import { currentXItems, isCurrentXCache, parseXDiscovery, parseXEmbed, selectXTopics, xEmbedUrl, xPostDate, xPostUrl } from "../server/utils/x-topics"
import x from "../server/sources/x"
import { myFetch } from "../server/utils/fetch"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const fetchMock = vi.mocked(myFetch)
const now = Date.parse("2026-10-24T12:00:00Z")
const date = now - 86400000
const postId = (index = 0, createdAt = date) => (((BigInt(createdAt) - 1288834974657n) << 22n) + BigInt(index)).toString()
const postUrl = (index = 0, createdAt = date) => `https://x.com/creator/status/${postId(index, createdAt)}`
const article = (index = 0) => `https://news.google.com/rss/articles/CBMix${index}?oc=5`
const discovery = { id: article(), url: article(), title: "A public discussion of science", pubDate: now - 1000 }
function embed(index = 0, patch: Record<string, unknown> = {}, createdAt = date) {
  return { __typename: "Tweet", id_str: postId(index, createdAt), created_at: new Date(createdAt).toISOString(), favorite_count: 100 + index, user: { screen_name: "creator" }, text: `A recent public science discussion ${index} https://t.co/example`, ...patch }
}
function feed(indexedAt = now - 1000, publisher = "https://x.com") {
  return `<rss><channel>${Array.from({ length: 12 }, (_, index) => `<item><title>A public science discussion ${index} - X</title><link>${article(index)}</link><source url="${publisher}">X</source><pubDate>${new Date(indexedAt).toUTCString()}</pubDate></item>`).join("")}</channel></rss>`
}

describe("x seven-day topic recommendations", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    fetchMock.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it("keeps X's identity and accepts only canonical public post links", () => {
    expect(genSources().x).toMatchObject({ name: "X", title: "7-day topic picks", type: "hottest" })
    expect(xPostUrl(`${postUrl().replace("x.com", "mobile.twitter.com")}/photo/1?s=20`)).toBe(postUrl())
    expect(xPostDate(postUrl())).toBe(date)
    for (const value of ["https://x.com/explore", "https://docs.x.com/changelog", "https://x.com/creator", `https://x.com.evil.example/creator/status/${postId()}`, postUrl().replace("https:", "http:"), postUrl().replace("x.com", "user:pass@x.com")]) expect(xPostUrl(value)).toBeUndefined()
    expect(() => xEmbedUrl("../secret")).toThrow()
  })

  it("requires recent discovery and verifies the original date separately", () => {
    expect(parseXDiscovery(feed())).toHaveLength(12)
    expect(parseXDiscovery(feed(now - 7 * 86400000))).toEqual([])
    expect(parseXDiscovery(feed(now + 1000))).toEqual([])
    expect(() => parseXDiscovery(feed(now - 1000, "https://evil.example"))).toThrow()
    const old = now - 8 * 86400000
    expect(() => parseXEmbed(embed(0, {}, old), postUrl(0, old), discovery)).toThrow()
    expect(() => parseXEmbed(embed(), postUrl(), { ...discovery, pubDate: undefined })).toThrow()
  })

  it("uses the original post text, author, date and visible cumulative likes", () => {
    expect(parseXEmbed(embed(), postUrl(), discovery)).toMatchObject({ id: postId(), url: postUrl(), title: "@creator — A recent public science discussion 0", pubDate: date, extra: { x: { createdAt: date, indexedAt: now - 1000, likes: 100 }, info: "7-day topic picks · 100 likes · Published: 2026-10-23" } })
  })

  it("rejects private, missing, mismatched, future, date-inconsistent and hidden-count posts", () => {
    for (const patch of [{ __typename: "TweetTombstone" }, { id_str: postId(1) }, { user: { screen_name: "creator", protected: true } }, { favorite_count: undefined }, { favorite_count: 0 }, { favorite_count: -1 }, { favorite_count: 1.5 }, { created_at: new Date(date + 2000).toISOString() }, { created_at: "invalid" }]) expect(() => parseXEmbed(embed(0, patch), postUrl(), discovery)).toThrow()
    const future = now + 1000
    expect(() => parseXEmbed(embed(0, {}, future), postUrl(0, future), discovery)).toThrow()
    const boundary = now - 7 * 86400000
    expect(() => parseXEmbed(embed(0, {}, boundary), postUrl(0, boundary), discovery)).toThrow()
  })

  it("ranks sampled discussions by likes, deduplicates text, caps at ten and prefers fresh metrics", () => {
    const items = Array.from({ length: 12 }, (_, index) => parseXEmbed(embed(index), postUrl(index), discovery))
    const selected = selectXTopics(items)
    expect(selected).toHaveLength(10)
    expect(selected[0].extra?.x?.likes).toBe(111)
    const updated = parseXEmbed(embed(11, { favorite_count: 20 }), postUrl(11), discovery)
    expect(selectXTopics([updated, items[11]])[0].extra?.x?.likes).toBe(20)
    const duplicate = parseXEmbed(embed(1, { text: embed().text }), postUrl(1), discovery)
    expect(selectXTopics([items[0], duplicate])).toHaveLength(1)
  })

  it("prunes expired posts individually and rejects the old developer changelog cache", () => {
    const item = parseXEmbed(embed(), postUrl(), discovery)
    expect(isCurrentXCache({ id: "x", items: [item] })).toBe(true)
    expect(isCurrentXCache({ id: "x", items: [{ id: "old", title: "API changelog", url: "https://docs.x.com/changelog" }] })).toBe(false)
    expect(currentXItems([item], date + 7 * 86400000)).toEqual([])
    expect(isCurrentXCache({ id: "cnn", items: [] })).toBe(true)
  })

  it("fetches ten verified recent posts and shares concurrent discovery requests", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = input.toString()
      if (url.includes("/rss/search?")) return feed() as any
      if (url.includes("/rss/articles/")) {
        const id = new URL(url).pathname.split("/").at(-1)
        return `<div data-n-a-id="${id}" data-n-a-ts="1792830000" data-n-a-sg="abc-123"></div>` as any
      }
      if (url.includes("batchexecute")) return `)]}'\n${JSON.stringify(Array.from({ length: 12 }, (_, index) => ["wrb.fr", "Fbv4je", JSON.stringify(["garturlres", postUrl(index)]), null, null, null, String(index)]))}` as any
      if (url.startsWith("https://cdn.syndication.twimg.com/tweet-result?")) return embed(Number(BigInt(new URL(url).searchParams.get("id")!) - BigInt(postId()))) as any
      throw new Error("Unexpected public URL")
    })
    const [first, second] = await Promise.all([x(), x()])
    expect(first).toHaveLength(10)
    expect(second).toEqual(first)
    expect(new Set(first.map(item => item.id)).size).toBe(10)
    expect(fetchMock.mock.calls.filter(([url]) => url.toString().includes("/rss/search?"))).toHaveLength(3)
    expect(fetchMock.mock.calls.every(([url]) => ["news.google.com", "cdn.syndication.twimg.com"].includes(new URL(url.toString()).hostname))).toBe(true)
    const implementation = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input, options) => {
      if (input.toString().startsWith("https://cdn.syndication.twimg.com/")) throw Object.assign(new Error("Limited"), { statusCode: 429 })
      return implementation(input, options)
    })
    fetchMock.mockClear()
    await expect(x()).rejects.toThrow("No valid public platform content")
    expect(fetchMock.mock.calls.filter(([url]) => url.toString().startsWith("https://cdn.syndication.twimg.com/"))).toHaveLength(6)
  })

  it("fails honestly instead of substituting developer news when discovery is unavailable", async () => {
    fetchMock.mockRejectedValue(new Error("Unavailable"))
    await expect(x()).rejects.toThrow("X seven-day topics unavailable")
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
