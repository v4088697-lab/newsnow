import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { NewsItem } from "../shared/types"
import { genSources } from "../shared/pre-sources"
import { currentQuoraItems, isCurrentQuoraCache, parseQuoraDiscovery, quoraQuestionUrl, quoraTopic, selectQuoraTopics } from "../server/utils/quora-topics"
import quora from "../server/sources/quora"
import { myFetch } from "../server/utils/fetch"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
const fetchMock = vi.mocked(myFetch)
const now = Date.parse("2026-10-24T12:00:00Z")
const date = now - 86400000
const article = (id: number) => `https://news.google.com/rss/articles/CBMiquora${id}?oc=5`
const question = (id: number) => `https://www.quora.com/What-can-we-learn-from-science-${id}`
const discovery = (id: number): NewsItem => ({ id: article(id), url: article(id), title: `What can we learn from science ${id}?`, pubDate: date })
function feed(indexedAt = date, publisher = "https://www.quora.com", title?: string) {
  return `<rss><channel>${Array.from({ length: 12 }, (_, id) => `<item><title>${title ?? discovery(id).title} - Quora</title><link>${article(id)}</link><source url="${publisher}">Quora</source><pubDate>${new Date(indexedAt).toUTCString()}</pubDate></item>`).join("")}</channel></rss>`
}

describe("quora seven-day topic recommendations", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    fetchMock.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it("retains the source identity while describing the measured scope honestly", () => {
    expect(genSources().quora).toMatchObject({ name: "Quora", title: "7-day topic picks", type: "hottest" })
    expect(genSources().quora.desc).toContain("not an official Quora popularity ranking")
    expect(quoraQuestionUrl(`${question(1)}/answer/Writer?share=1`)).toBe(question(1))
    for (const url of ["https://quorablog.quora.com/Official-news", "https://science.quora.com/Interesting-question", "https://www.quora.com/profile/Writer", "https://www.quora.com/topic/Science", "https://www.quora.com/", "https://www.quora.com.evil.example/What-is-science", "http://www.quora.com/What-is-science", "https://user:pass@www.quora.com/What-is-science"]) expect(quoraQuestionUrl(url)).toBeUndefined()
  })

  it("excludes old and future index dates, Spaces, blog posts, profiles and obvious support spam", () => {
    expect(parseQuoraDiscovery(feed())).toHaveLength(12)
    expect(parseQuoraDiscovery(feed(now - 7 * 86400000))).toEqual([])
    expect(parseQuoraDiscovery(feed(now + 1000))).toEqual([])
    expect(() => parseQuoraDiscovery(feed(date, "https://quorablog.quora.com"))).toThrow()
    expect(() => parseQuoraDiscovery(feed(date, "https://science.quora.com"))).toThrow()
    expect(parseQuoraDiscovery(feed(date, undefined, "Follow this creator"))).toEqual([])
    expect(parseQuoraDiscovery(feed(date, undefined, "What is the customer service support number?"))).toEqual([])
  })

  it("labels index dates without inventing question dates, engagement metrics or ranks", () => {
    const item = quoraTopic(discovery(0), question(0))
    expect(item).toMatchObject({ id: question(0), url: question(0), pubDate: date, extra: { quora: { indexedAt: date }, info: "7-day indexed picks · Google News date: 2026-10-23" } })
    expect(item.extra).not.toHaveProperty("diff")
    expect(() => quoraTopic({ ...discovery(0), pubDate: now - 7 * 86400000 }, question(0))).toThrow()
    expect(() => quoraTopic({ ...discovery(0), pubDate: undefined }, question(0))).toThrow()
  })

  it("deduplicates questions and titles, caps at ten and never pads with expired topics", () => {
    const items = Array.from({ length: 12 }, (_, id) => quoraTopic(discovery(id), question(id)))
    const duplicate = { ...items[0], id: question(99), url: question(99) }
    expect(selectQuoraTopics([items[0], duplicate, ...items])).toHaveLength(10)
    expect(selectQuoraTopics([items[0], duplicate])).toHaveLength(1)
    const newer = quoraTopic({ ...discovery(99), pubDate: now - 1000 }, question(99))
    expect(selectQuoraTopics([...items, newer])[0]).toEqual(newer)
    expect(() => selectQuoraTopics(items, date + 7 * 86400000)).toThrow()
  })

  it("invalidates old official-blog cache and prunes expired questions individually", () => {
    const current = quoraTopic(discovery(0), question(0))
    const expired = { ...quoraTopic(discovery(1), question(1)), pubDate: now - 7 * 86400000, extra: { quora: { indexedAt: now - 7 * 86400000 } } }
    expect(isCurrentQuoraCache({ id: "quora", items: [current] })).toBe(true)
    expect(isCurrentQuoraCache({ id: "quora", items: [{ id: "blog", title: "Official blog", url: "https://quorablog.quora.com/" }] })).toBe(false)
    expect(currentQuoraItems([current, expired])).toEqual([current])
    expect(isCurrentQuoraCache({ id: "cnn", items: [] })).toBe(true)
  })

  it("fetches ten real question links without accessing Quora login or private content", async () => {
    let call = 0
    fetchMock.mockImplementation(async (input) => {
      const url = input.toString()
      if (url.includes("/rss/search?")) {
        const offset = call++ * 12
        return feed().replace(/CBMiquora(\d+)/g, (_, id) => `CBMiquora${Number(id) + offset}`).replace(/science (\d+)/g, (_, id) => `science ${Number(id) + offset}`) as any
      }
      if (url.includes("/rss/articles/")) {
        const id = new URL(url).pathname.split("/").at(-1)
        return `<div data-n-a-id="${id}" data-n-a-ts="1792830000" data-n-a-sg="abc-123"></div>` as any
      }
      if (url.includes("batchexecute")) return `)]}'\n${JSON.stringify(Array.from({ length: 24 }, (_, index) => ["wrb.fr", "Fbv4je", JSON.stringify(["garturlres", question(Math.floor(index / 8) * 12 + index % 8)]), null, null, null, String(index)]))}` as any
      throw new Error("Unexpected URL")
    })
    const items = await quora()
    expect(items).toHaveLength(10)
    expect(new Set(items.map(item => item.url)).size).toBe(10)
    for (const item of items) expect(item.url).toBe(question(Number(/science (\d+)/.exec(item.title)?.[1])))
    expect(fetchMock.mock.calls.every(([url]) => new URL(url.toString()).hostname === "news.google.com")).toBe(true)
    expect(fetchMock.mock.calls.filter(([url]) => url.toString().includes("/rss/search?"))).toHaveLength(3)
  })

  it("reports an unavailable feed without substituting old corporate news", async () => {
    fetchMock.mockRejectedValue(new Error("Unavailable"))
    await expect(quora()).rejects.toThrow("Quora seven-day topics unavailable")
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
