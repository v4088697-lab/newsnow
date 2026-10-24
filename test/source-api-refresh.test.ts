import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createEvent } from "h3"
import { sources } from "@shared/sources"
import entireHandler from "../server/api/s/entire.post"
import sourceHandler from "../server/api/s/index"
import { getters } from "#/getters"
import { getCacheTable } from "#/database/cache"

vi.mock("#/getters", () => ({ getters: { cnn: vi.fn(), youtube: vi.fn(), instagram: vi.fn(), facebook: vi.fn() } }))
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
