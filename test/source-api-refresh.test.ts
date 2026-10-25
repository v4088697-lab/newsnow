import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createEvent } from "h3"
import { sources } from "@shared/sources"
import entireHandler from "../server/api/s/entire.post"
import sourceHandler from "../server/api/s/index"
import { getters } from "#/getters"
import { getCacheTable } from "#/database/cache"

vi.mock("#/getters", () => ({ getters: { cnn: vi.fn(), youtube: vi.fn(), instagram: vi.fn(), facebook: vi.fn(), pinterest: vi.fn(), quora: vi.fn(), x: vi.fn(), rumble: vi.fn(), paramountplus: vi.fn(), peacock: vi.fn(), disneyplus: vi.fn() } }))
vi.mock("#/database/cache", () => ({ getCacheTable: vi.fn() }))

describe("source cache refresh", () => {
  const now = 1792598400000
  const items = [{ id: "old", title: "Old headline", url: "https://www.cnn.com/old" }]
  const cacheTable = { get: vi.fn(), set: vi.fn(), getEntire: vi.fn() }
  const request = (method = "GET", id = "cnn") => createEvent({ url: `/api/s?id=${id}`, method, headers: {}, body: { sources: [id] } } as any, {} as any)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    vi.clearAllMocks()
    vi.stubGlobal("logger", { success: vi.fn(), error: vi.fn() })
    vi.mocked(getCacheTable).mockResolvedValue(cacheTable as any)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("preserves the actual timestamp when reusing fresh cache", async () => {
    const updated = now - 60000
    cacheTable.get.mockResolvedValue({ id: "cnn", updated, items })
    const response = await sourceHandler(request())
    expect(response).toMatchObject({ status: "cache", updatedTime: updated, items })
    expect(getters.cnn).not.toHaveBeenCalled()
  })

  it.each(["rumble", "paramountplus", "peacock", "disneyplus"] as const)("replaces legacy %s news in single requests and bulk hydration", async (id) => {
    const old = { id, updated: now - 60000, items }
    const fresh = [{ id: "new-recommendation", title: "Current recommendation", url: "https://example.com/new" }]
    cacheTable.get.mockResolvedValue(old)
    cacheTable.getEntire.mockResolvedValue([old])
    vi.mocked(getters[id]).mockResolvedValue(fresh)
    expect((await sourceHandler(request("GET", id))).items).toEqual(fresh)
    expect(await entireHandler(request("POST", id))).toEqual([])
  })

  it("refreshes at the configured interval without requiring login or latest", async () => {
    cacheTable.get.mockResolvedValue({ id: "cnn", updated: now - sources.cnn.interval, items })
    const fresh = [{ id: "new", title: "New headline", url: "https://www.cnn.com/new" }]
    vi.mocked(getters.cnn).mockResolvedValue(fresh)
    const response = await sourceHandler(request())
    expect(response.items).toEqual(fresh)
    expect(response.updatedTime).toBe(now)
    expect(cacheTable.set).toHaveBeenCalledWith("cnn", fresh, now)
  })

  it("keeps the original cache age when the publisher is unavailable", async () => {
    const updated = now - 60 * 60 * 1000
    cacheTable.get.mockResolvedValue({ id: "cnn", updated, items })
    vi.mocked(getters.cnn).mockRejectedValue(new Error("Publisher unavailable"))
    expect(await sourceHandler(request())).toMatchObject({ status: "cache", updatedTime: updated, items })
  })

  it("does not make bulk cache snapshots appear freshly fetched", async () => {
    const updated = now - 60000
    cacheTable.getEntire.mockResolvedValue([{ id: "cnn", updated, items }])
    expect(await entireHandler(request("POST"))).toEqual([{ id: "cnn", status: "cache", updatedTime: updated, items }])
  })

  it("replaces fresh legacy YouTube announcements and omits them from bulk hydration", async () => {
    const old = { id: "youtube", updated: now - 60000, items: [{ id: "blog", title: "Official update", url: "https://blog.youtube/news/" }] }
    const fresh = [{ id: "abcdefghijk", title: "Real video", url: "https://www.youtube.com/watch?v=abcdefghijk", extra: { youtube: { expiresAt: now + 3600000, views: 1234 } } }]
    cacheTable.get.mockResolvedValue(old)
    cacheTable.getEntire.mockResolvedValue([old])
    vi.mocked(getters.youtube).mockResolvedValue(fresh)
    expect((await sourceHandler(request("GET", "youtube"))).items).toEqual(fresh)
    expect(await entireHandler(request("POST", "youtube"))).toEqual([])
  })

  it("retains valid YouTube fallback timestamps but never returns expired seven-day videos", async () => {
    const updated = now - 3600000
    const videoItems = [{ id: "abcdefghijk", title: "Real video", url: "https://www.youtube.com/watch?v=abcdefghijk", extra: { youtube: { expiresAt: now + 3600000, views: 1234 } } }]
    cacheTable.get.mockResolvedValue({ id: "youtube", updated, items: videoItems })
    vi.mocked(getters.youtube).mockRejectedValue(new Error("YouTube unavailable"))
    expect(await sourceHandler(request("GET", "youtube"))).toMatchObject({ updatedTime: updated, items: videoItems })
    cacheTable.get.mockResolvedValue({ id: "youtube", updated, items: [{ ...videoItems[0], extra: { youtube: { expiresAt: now, views: 1234 } } }] })
    await expect(sourceHandler(request("GET", "youtube"))).rejects.toThrow("YouTube unavailable")
  })

  it("replaces Instagram company news in both the single source and bulk cache paths", async () => {
    const old = { id: "instagram", updated: now - 60000, items: [{ id: "blog", title: "Meta update", url: "https://about.fb.com/news/" }] }
    const fresh = [{ id: "abcdefghijk", title: "Public post", url: "https://www.instagram.com/p/abcdefghijk/", extra: { instagram: { indexedAt: now - 86400000, likes: 100 } } }]
    cacheTable.get.mockResolvedValue(old)
    cacheTable.getEntire.mockResolvedValue([old])
    vi.mocked(getters.instagram).mockResolvedValue(fresh)
    expect((await sourceHandler(request("GET", "instagram"))).items).toEqual(fresh)
    expect(await entireHandler(request("POST", "instagram"))).toEqual([])
    const expired = { id: "instagram", updated: now - 60000, items: [{ ...fresh[0], extra: { instagram: { indexedAt: now - 7 * 86400000, likes: 100 } } }] }
    cacheTable.get.mockResolvedValue(expired)
    cacheTable.getEntire.mockResolvedValue([expired])
    vi.mocked(getters.instagram).mockRejectedValue(new Error("Instagram unavailable"))
    await expect(sourceHandler(request("GET", "instagram"))).rejects.toThrow("Instagram unavailable")
    expect(await entireHandler(request("POST", "instagram"))).toEqual([])
  })

  it("replaces Facebook company news in single and bulk caches, keeping valid fallback timestamps", async () => {
    const old = { id: "facebook", updated: now - 60000, items: [{ id: "blog", title: "Meta update", url: "https://about.fb.com/news/" }] }
    const fresh = [{ id: "1234567890", title: "Public video", url: "https://www.facebook.com/reel/1234567890/", extra: { facebook: { indexedAt: now - 86400000, reactions: 4300 } } }]
    cacheTable.get.mockResolvedValue(old)
    cacheTable.getEntire.mockResolvedValue([old])
    vi.mocked(getters.facebook).mockResolvedValue(fresh)
    expect((await sourceHandler(request("GET", "facebook"))).items).toEqual(fresh)
    expect(await entireHandler(request("POST", "facebook"))).toEqual([])
    const updated = now - 3600000
    cacheTable.get.mockResolvedValue({ id: "facebook", updated, items: fresh })
    vi.mocked(getters.facebook).mockRejectedValue(new Error("Facebook unavailable"))
    expect(await sourceHandler(request("GET", "facebook"))).toMatchObject({ items: fresh, updatedTime: updated })
    const expired = { id: "facebook", updated, items: [{ ...fresh[0], extra: { facebook: { indexedAt: now - 7 * 86400000, reactions: 4300 } } }] }
    cacheTable.get.mockResolvedValue(expired)
    cacheTable.getEntire.mockResolvedValue([expired])
    await expect(sourceHandler(request("GET", "facebook"))).rejects.toThrow("Facebook unavailable")
    expect(await entireHandler(request("POST", "facebook"))).toEqual([])
  })

  it("migrates Pinterest categories to verified recent Pins and never falls back to expired creation dates", async () => {
    const old = { id: "pinterest", updated: now - 60000, items: [{ id: "category", title: "Ideas", url: "https://www.pinterest.com/ideas/art/12345/" }] }
    const createdAt = now - 86400000
    const fresh = [{ id: "1234567890", title: "Public Pin", url: "https://www.pinterest.com/pin/1234567890/", pubDate: createdAt, extra: { pinterest: { createdAt, aggregateSaves: 1234 } } }]
    cacheTable.get.mockResolvedValue(old)
    cacheTable.getEntire.mockResolvedValue([old])
    vi.mocked(getters.pinterest).mockResolvedValue(fresh)
    expect((await sourceHandler(request("GET", "pinterest"))).items).toEqual(fresh)
    expect(await entireHandler(request("POST", "pinterest"))).toEqual([])
    const updated = now - 3600000
    cacheTable.get.mockResolvedValue({ id: "pinterest", updated, items: fresh })
    vi.mocked(getters.pinterest).mockRejectedValue(new Error("Pinterest unavailable"))
    expect(await sourceHandler(request("GET", "pinterest"))).toMatchObject({ items: fresh, updatedTime: updated })
    const expired = { id: "pinterest", updated, items: [{ ...fresh[0], pubDate: now - 7 * 86400000, extra: { pinterest: { createdAt: now - 7 * 86400000 } } }] }
    cacheTable.get.mockResolvedValue(expired)
    cacheTable.getEntire.mockResolvedValue([expired])
    await expect(sourceHandler(request("GET", "pinterest"))).rejects.toThrow("Pinterest unavailable")
    expect(await entireHandler(request("POST", "pinterest"))).toEqual([])
  })

  it("fills a partial Pinterest cache to ten with a new batch instead of overwriting recent verified Pins", async () => {
    const createdAt = now - 86400000
    const pins = Array.from({ length: 10 }, (_, index) => ({ id: String(1234567890 + index), title: `Public Pin ${index}`, url: `https://www.pinterest.com/pin/${1234567890 + index}/`, pubDate: createdAt, extra: { pinterest: { createdAt, aggregateSaves: index } } }))
    cacheTable.get.mockResolvedValue({ id: "pinterest", updated: now - 120000, items: pins.slice(0, 9) })
    vi.mocked(getters.pinterest).mockResolvedValue([pins[9]])
    const result = await sourceHandler(request("GET", "pinterest"))
    expect(result.items).toHaveLength(10)
    expect(new Set(result.items.map(item => item.id)).size).toBe(10)
    expect(cacheTable.set).toHaveBeenCalledWith("pinterest", result.items, now)
    vi.mocked(getters.pinterest).mockClear()
    cacheTable.get.mockResolvedValue({ id: "pinterest", updated: now - 120000, items: pins })
    expect(await sourceHandler(request("GET", "pinterest"))).toMatchObject({ status: "cache", items: pins })
    expect(getters.pinterest).not.toHaveBeenCalled()
  })

  it("removes expired Pinterest entries individually from the bulk snapshot", async () => {
    const createdAt = now - 86400000
    const current = { id: "1234567890", title: "Current Pin", url: "https://www.pinterest.com/pin/1234567890/", pubDate: createdAt, extra: { pinterest: { createdAt } } }
    const expiredAt = now - 7 * 86400000
    const expired = { id: "1234567891", title: "Expired Pin", url: "https://www.pinterest.com/pin/1234567891/", pubDate: expiredAt, extra: { pinterest: { createdAt: expiredAt } } }
    cacheTable.getEntire.mockResolvedValue([{ id: "pinterest", updated: now - 60000, items: [current, expired] }])
    expect(await entireHandler(request("POST", "pinterest"))).toMatchObject([{ id: "pinterest", items: [current], updatedTime: now - 60000 }])
  })

  it("replaces Quora blog caches and filters expired questions in single and bulk requests", async () => {
    const updated = now - 120000
    const legacy = { id: "quora", updated, items: [{ id: "blog", title: "Official blog", url: "https://quorablog.quora.com/" }] }
    const indexedAt = now - 86400000
    const url = "https://www.quora.com/What-is-the-future-of-science"
    const topic = { id: url, url, title: "What is the future of science?", pubDate: indexedAt, extra: { quora: { indexedAt } } }
    cacheTable.get.mockResolvedValue(legacy)
    cacheTable.getEntire.mockResolvedValue([legacy])
    vi.mocked(getters.quora).mockResolvedValue([topic])
    expect((await sourceHandler(request("GET", "quora"))).items).toEqual([topic])
    expect(await entireHandler(request("POST", "quora"))).toEqual([])
    const expiredAt = now - 7 * 86400000
    const expired = { ...topic, pubDate: expiredAt, extra: { quora: { indexedAt: expiredAt } } }
    cacheTable.get.mockResolvedValue({ id: "quora", updated, items: [topic, expired] })
    cacheTable.getEntire.mockResolvedValue([{ id: "quora", updated, items: [topic, expired] }])
    vi.mocked(getters.quora).mockRejectedValue(new Error("Quora unavailable"))
    expect(await sourceHandler(request("GET", "quora"))).toMatchObject({ items: [topic], updatedTime: updated })
    expect(await entireHandler(request("POST", "quora"))).toMatchObject([{ items: [topic], updatedTime: updated }])
    cacheTable.get.mockResolvedValue({ id: "quora", updated, items: [expired] })
    await expect(sourceHandler(request("GET", "quora"))).rejects.toThrow("Quora unavailable")
  })

  it("replenishes a partial Quora cache at one minute and merges to ten distinct topics", async () => {
    const indexedAt = now - 86400000
    const topics = Array.from({ length: 10 }, (_, index) => {
      const url = `https://www.quora.com/What-is-recent-topic-${index}`
      return { id: url, url, title: `What is recent topic ${index}?`, pubDate: indexedAt, extra: { quora: { indexedAt } } }
    })
    cacheTable.get.mockResolvedValue({ id: "quora", updated: now - 120000, items: topics.slice(0, 9) })
    vi.mocked(getters.quora).mockResolvedValue([topics[9]])
    const result = await sourceHandler(request("GET", "quora"))
    expect(result.items).toHaveLength(10)
    expect(new Set(result.items.map(item => item.url)).size).toBe(10)
    expect(cacheTable.set).toHaveBeenCalledWith("quora", result.items, now)
    vi.mocked(getters.quora).mockClear()
    cacheTable.get.mockResolvedValue({ id: "quora", updated: now - 120000, items: topics })
    expect(await sourceHandler(request("GET", "quora"))).toMatchObject({ status: "cache", items: topics })
    expect(getters.quora).not.toHaveBeenCalled()
  })

  it("migrates X developer updates, removes expired posts and preserves fallback timestamps", async () => {
    const updated = now - 120000
    const createdAt = now - 86400000
    const id = ((BigInt(createdAt) - 1288834974657n) << 22n).toString()
    const topic = { id, url: `https://x.com/creator/status/${id}`, title: "A recent public discussion", pubDate: createdAt, extra: { x: { createdAt, indexedAt: createdAt, likes: 300 } } }
    const legacy = { id: "x", updated, items: [{ id: "docs", title: "Developer changelog", url: "https://docs.x.com/changelog" }] }
    cacheTable.get.mockResolvedValue(legacy)
    cacheTable.getEntire.mockResolvedValue([legacy])
    vi.mocked(getters.x).mockResolvedValue([topic])
    expect((await sourceHandler(request("GET", "x"))).items).toEqual([topic])
    expect(await entireHandler(request("POST", "x"))).toEqual([])
    const expiredAt = now - 7 * 86400000
    const expired = { ...topic, pubDate: expiredAt, extra: { x: { createdAt: expiredAt, indexedAt: expiredAt, likes: 300 } } }
    cacheTable.get.mockResolvedValue({ id: "x", updated, items: [topic, expired] })
    cacheTable.getEntire.mockResolvedValue([{ id: "x", updated, items: [topic, expired] }])
    vi.mocked(getters.x).mockRejectedValue(new Error("X unavailable"))
    expect(await sourceHandler(request("GET", "x"))).toMatchObject({ items: [topic], updatedTime: updated })
    expect(await entireHandler(request("POST", "x"))).toMatchObject([{ items: [topic], updatedTime: updated }])
    cacheTable.get.mockResolvedValue({ id: "x", updated, items: [expired] })
    await expect(sourceHandler(request("GET", "x"))).rejects.toThrow("X unavailable")
  })

  it("fills X recommendations to ten without retaining stale higher likes for a refreshed post", async () => {
    const createdAt = now - 86400000
    const topics = Array.from({ length: 10 }, (_, index) => {
      const id = (((BigInt(createdAt) - 1288834974657n) << 22n) + BigInt(index)).toString()
      return { id, url: `https://x.com/creator/status/${id}`, title: `Recent public discussion ${index}`, pubDate: createdAt, extra: { x: { createdAt, indexedAt: createdAt, likes: index + 100 } } }
    })
    cacheTable.get.mockResolvedValue({ id: "x", updated: now - 120000, items: topics.slice(0, 9) })
    vi.mocked(getters.x).mockResolvedValue([{ ...topics[0], extra: { x: { ...topics[0].extra.x, likes: 20 } } }, topics[9]])
    const result = await sourceHandler(request("GET", "x"))
    expect(result.items).toHaveLength(10)
    expect(result.items.at(-1)?.extra?.x?.likes).toBe(20)
    expect(cacheTable.set).toHaveBeenCalledWith("x", result.items, now)
  })

  it.each([60000, 3600000])("shows English annotations from existing cache aged %i ms without translating headlines", async (age) => {
    const updated = now - age
    const original = Object.freeze({ id: "old", title: "新闻原标题", url: "https://www.cnn.com/old", extra: Object.freeze({ info: "官方动态 · 2026-10-20 · Google News" }) })
    cacheTable.get.mockResolvedValue({ id: "cnn", updated, items: [original] })
    vi.mocked(getters.cnn).mockRejectedValue(new Error("Publisher unavailable"))
    const result = await sourceHandler(request())
    expect(result.updatedTime).toBe(updated)
    expect(result.items[0]).toMatchObject({ title: original.title, url: original.url, extra: { info: "Official updates · 2026-10-20 · Google News" } })
    expect(original.extra.info).toBe("官方动态 · 2026-10-20 · Google News")
  })

  it("localizes old bulk chart annotations while preserving ranks, dates and original titles", async () => {
    const updated = now - 60000
    const original = { id: "track", title: "歌曲原名 — Artiste", url: "https://open.spotify.com/track/example", extra: { info: "↑18 位 · 65→47 · 全球公开前50 · 2026-10-09～2026-10-15" } }
    cacheTable.getEntire.mockResolvedValue([{ id: "spotify", updated, items: [original] }])
    expect(await entireHandler(request("POST"))).toEqual([{ id: "spotify", status: "cache", updatedTime: updated, items: [{ ...original, extra: { info: "↑18 places · 65→47 · Global public top 50 · 2026-10-09 to 2026-10-15" } }] }])
  })
})
