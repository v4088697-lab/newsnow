import { afterEach, describe, expect, it, vi } from "vitest"
import tiktok from "../sources/tiktok"
import { myFetch } from "./fetch"

vi.mock("./fetch", () => ({ myFetch: vi.fn() }))
afterEach(() => vi.resetAllMocks())

function response(prefix: string, count = 3) {
  return {
    BaseResp: { StatusCode: 0 },
    items: Array.from({ length: count }, (_, index) => ({
      hashtagID: `${prefix}-${index}`,
      hashtagName: `${prefix}${index}`,
      rankIndex: index + 1,
      publishCnt: 1000,
    })),
  }
}

describe("tikTok ten-trend collection", () => {
  it("supplements the three-entry public list with distinct, labelled industry trends", async () => {
    vi.mocked(myFetch).mockImplementation(async (_url, options) => {
      const body = options?.body as { industryID?: number }
      return response(String(body.industryID ?? "general"))
    })
    const items = await tiktok()
    expect(items).toHaveLength(10)
    expect(new Set(items.map(item => item.id)).size).toBe(10)
    expect(items.slice(0, 3).every(item => !String(item.extra?.info ?? "").includes("Category trends"))).toBe(true)
    expect(items.slice(3).every(item => String(item.extra?.info ?? "").includes("Category trends"))).toBe(true)
    expect(myFetch).toHaveBeenCalledTimes(5)
    for (const [, options] of vi.mocked(myFetch).mock.calls) {
      expect(options?.body).toMatchObject({ countryCode: "US", timeRange: 7, limit: 10 })
    }
  })

  it("avoids extra requests when the general list already contains ten entries", async () => {
    vi.mocked(myFetch).mockResolvedValue(response("general", 10))
    expect(await tiktok()).toHaveLength(10)
    expect(myFetch).toHaveBeenCalledTimes(1)
  })

  it("removes overlaps and still supplies ten entries when one classification fails", async () => {
    vi.mocked(myFetch).mockImplementation(async (_url, options) => {
      const body = options?.body as { industryID?: number }
      if (body.industryID === 15000000000) throw new Error("Temporarily unavailable")
      const data = response(String(body.industryID ?? "general"))
      if (body.industryID === 11000000000) data.items[0] = response("general").items[0]
      return data
    })
    const items = await tiktok()
    expect(items).toHaveLength(10)
    expect(items.filter(item => item.id === "general-0")).toHaveLength(1)
  })

  it("rejects insufficient unique results so a complete cache can be retained", async () => {
    vi.mocked(myFetch).mockResolvedValue(response("same"))
    await expect(tiktok()).rejects.toThrow("fewer than 10 distinct trends")
  })
})
