import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createEvent } from "h3"
import { sources } from "@shared/sources"
import entireHandler from "../server/api/s/entire.post"
import sourceHandler from "../server/api/s/index"
import { getters } from "#/getters"
import { getCacheTable } from "#/database/cache"

vi.mock("#/getters", () => ({ getters: { cnn: vi.fn() } }))
vi.mock("#/database/cache", () => ({ getCacheTable: vi.fn() }))

describe("source cache refresh", () => {
  const now = 1792598400000
  const items = [{ id: "old", title: "Old headline", url: "https://www.cnn.com/old" }]
  const cacheTable = { get: vi.fn(), set: vi.fn(), getEntire: vi.fn() }
  const request = (method = "GET") => createEvent({ url: "/api/s?id=cnn", method, headers: {}, body: { sources: ["cnn"] } } as any, {} as any)

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
})
