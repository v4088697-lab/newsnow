import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { currentPinterestItems, isCurrentPinterestCache, mergePinterestPins, parsePinterestDiscovery, parsePinterestPin, pinterestPinUrl, selectPinterestPins } from "../server/utils/pinterest-content"
import pinterest from "../server/sources/pinterest"
import { myFetch } from "../server/utils/fetch"
import { genSources } from "../shared/pre-sources"
import { getCacheTable } from "../server/database/cache"

vi.mock("../server/utils/fetch", () => ({ myFetch: vi.fn() }))
vi.mock("../server/database/cache", () => ({ getCacheTable: vi.fn() }))
const stateTable = { getState: vi.fn(), setState: vi.fn() }
const fetchMock = vi.mocked(myFetch)
const now = Date.parse("2026-10-24T12:00:00Z")
const createdAt = now - 86400000
const url = "https://www.pinterest.com/pin/1234567890/"
const article = "https://news.google.com/rss/articles/CBMipinterest?oc=5"
const discovery = { id: article, title: "Indexed original caption", url: article, pubDate: now - 1000 }
function feed(date = now - 1000, publisher = "https://www.pinterest.com") {
  return `<rss><channel><item><title>Indexed original caption - Pinterest</title><link>${article}</link><source url="${publisher}">Pinterest</source><pubDate>${new Date(date).toUTCString()}</pubDate></item></channel></rss>`
}
function pinPage(patch: Record<string, unknown> = {}, pinId = "1234567890") {
  const pin = { __typename: "Pin", entityId: pinId, createdAt: new Date(createdAt).toUTCString(), isVideo: false, title: "Autumn &amp; style", repinCount: 12, aggregatedPinData: { aggregatedStats: { saves: 1234 } }, images_474x: { url: "https://i.pinimg.com/474x/photo.jpg" }, pinner: { username: "creator" }, board: { privacy: "public" }, ...patch }
  const query = encodeURIComponent(JSON.stringify({ variables: { pinId } }))
  return `<meta property="og:url" content="https://www.pinterest.com/pin/${pinId}/"><meta property="og:title" content="Pinterest"><meta property="og:updated_time" content="${new Date(now).toISOString()}"><script>window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__(${JSON.stringify(query)},${JSON.stringify({ data: { v3GetPinQueryv2: { data: pin } } })});</script>`
}

describe("pinterest seven-day image and text recommendations", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    fetchMock.mockReset()
    stateTable.getState.mockReset().mockResolvedValue({ cursor: 0, retryAt: 0 })
    stateTable.setState.mockReset().mockResolvedValue(undefined)
    vi.mocked(getCacheTable).mockResolvedValue(stateTable as any)
  })
  afterEach(() => vi.useRealTimers())

  it("keeps Pinterest in the visual category and canonicalizes only actual Pin URLs", () => {
    expect(genSources().pinterest).toMatchObject({ name: "Pinterest", title: "7-day image & text picks", column: "visual", type: "hottest" })
    expect(pinterestPinUrl("https://ie.pinterest.com/pin/1234567890/?tracking=foo")).toBe(url)
    expect(pinterestPinUrl("https://www.pinterest.com/pin/autumn-style--1234567890/")).toBe(url)
    for (const value of ["https://www.pinterest.com/ideas/", "https://www.pinterest.com/pin-creation-tool/", "https://pinterest.com.evil.example/pin/1234567890/", "http://www.pinterest.com/pin/1234567890/"]) expect(pinterestPinUrl(value)).toBeUndefined()
  })

  it("uses recent publisher-verified discovery without treating the index date as a creation date", () => {
    expect(parsePinterestDiscovery(feed())).toMatchObject([{ pubDate: now - 1000 }])
    expect(() => parsePinterestDiscovery(feed(undefined, "https://evil.example"))).toThrow()
    expect(parsePinterestDiscovery(feed(now - 7 * 86400000))).toEqual([])
    expect(parsePinterestDiscovery(feed(now + 1000))).toEqual([])
    expect(() => parsePinterestPin(pinPage({ createdAt: new Date(now - 8 * 86400000).toUTCString() }), url, discovery)).toThrow("creation window")
    expect(() => parsePinterestPin(pinPage({ createdAt: undefined }), url, discovery)).toThrow("metadata unavailable")
  })

  it("shows the actual Pin creation date and distinguishes aggregate saves from individual repins", () => {
    const item = parsePinterestPin(pinPage(), url, discovery)
    expect(item).toMatchObject({ id: "1234567890", title: "@creator — Autumn & style", url, pubDate: createdAt, extra: { image: "https://i.pinimg.com/474x/photo.jpg", pinterest: { createdAt, repins: 12, aggregateSaves: 1234 }, info: "7-day Pin picks · 1,234 aggregate saves · Published: 2026-10-23" } })
    expect(parsePinterestPin(pinPage({ aggregatedPinData: null }), url, discovery).extra?.info).toContain("12 repins")
    expect(parsePinterestPin(pinPage({ aggregatedPinData: null, repinCount: undefined }), url, discovery).extra?.info).not.toContain("repins")
    expect(() => parsePinterestPin(pinPage({ createdAt: new Date(now - 7 * 86400000).toUTCString() }), url, discovery)).toThrow("creation window")
    expect(() => parsePinterestPin(pinPage({ createdAt: new Date(now + 1000).toUTCString() }), url, discovery)).toThrow("creation window")
  })

  it("excludes videos, ads, secret boards, untrusted images, wrong identities and unrelated script data", () => {
    for (const patch of [{ isVideo: true }, { isVideo: undefined }, { isPromoted: true }, { isThirdPartyAd: true }, { board: { privacy: "secret" } }]) expect(() => parsePinterestPin(pinPage(patch), url, discovery)).toThrow("public organic image")
    expect(() => parsePinterestPin(pinPage({ images_474x: { url: "https://i.pinimg.com.evil.example/photo.jpg" } }), url, discovery)).toThrow("image unavailable")
    expect(() => parsePinterestPin(pinPage({}, "9999999999"), url, discovery)).toThrow("Pin unavailable")
    expect(() => parsePinterestPin(`<meta property="og:url" content="${url}"><script>window.badCode();</script>`, url, discovery)).toThrow("metadata unavailable")
  })

  it("sorts compatible public counters, then newer creation dates, deduplicating and capping at ten", () => {
    const first = parsePinterestPin(pinPage(), url, discovery)
    const less = parsePinterestPin(pinPage({ aggregatedPinData: { aggregatedStats: { saves: 50 } } }, "1234567891"), "https://www.pinterest.com/pin/1234567891/", discovery)
    const noCount = parsePinterestPin(pinPage({ aggregatedPinData: null, repinCount: undefined }, "1234567892"), "https://www.pinterest.com/pin/1234567892/", discovery)
    expect(selectPinterestPins([noCount, less, first, first]).map(item => item.id)).toEqual(["1234567890", "1234567891", "1234567892"])
    expect(selectPinterestPins(Array.from({ length: 15 }, (_, index) => ({ ...first, id: String(index) })))).toHaveLength(10)
  })

  it("fetches actual Pins and stops public requests when Pinterest rate-limits them", async () => {
    fetchMock.mockImplementation(async (input) => {
      const value = input.toString()
      if (value.includes("/rss/search?")) return feed() as any
      if (value === article) return "<div data-n-a-id=\"CBMipinterest\" data-n-a-ts=\"1792830000\" data-n-a-sg=\"abc-123\"></div>" as any
      if (value.includes("batchexecute")) return `)]}'\n${JSON.stringify([["wrb.fr", "Fbv4je", JSON.stringify(["garturlres", url, 1]), null, null, null, "0"]])}` as any
      if (value === url) return pinPage() as any
      throw new Error("Unexpected URL")
    })
    const batches = await Promise.all([pinterest(), pinterest()])
    expect(batches).toMatchObject([[{ url, pubDate: createdAt }], [{ url, pubDate: createdAt }]])
    expect(stateTable.getState).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls.some(call => call[0].toString().includes("newsroom.pinterest.com"))).toBe(false)
    const implementation = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input, options) => {
      if (input.toString() === url) throw Object.assign(new Error("Limited"), { statusCode: 429 })
      return implementation(input, options)
    })
    await expect(pinterest()).rejects.toThrow("No valid public platform content")
    expect(fetchMock.mock.calls.at(-1)?.[1]).toMatchObject({ retry: 0, signal: expect.any(AbortSignal) })
  })

  it("invalidates legacy category/update caches and Pins when the creation window expires", () => {
    const items = [parsePinterestPin(pinPage(), url, discovery)]
    expect(isCurrentPinterestCache({ id: "pinterest", items })).toBe(true)
    expect(isCurrentPinterestCache({ id: "pinterest", items }, createdAt + 7 * 86400000)).toBe(false)
    expect(isCurrentPinterestCache({ id: "pinterest", items: [{ id: "category", title: "Ideas", url: "https://www.pinterest.com/ideas/art/12345/" }] })).toBe(false)
    expect(isCurrentPinterestCache({ id: "cnn", items: [] })).toBe(true)
  })

  it("retains verified recent Pins across partial batches and replaces stale metrics with fresh ones", () => {
    const old = parsePinterestPin(pinPage(), url, discovery)
    const second = parsePinterestPin(pinPage({}, "1234567891"), "https://www.pinterest.com/pin/1234567891/", discovery)
    const updated = parsePinterestPin(pinPage({ aggregatedPinData: { aggregatedStats: { saves: 20 } } }), url, discovery)
    const expired = { ...second, id: "1234567892", url: "https://www.pinterest.com/pin/1234567892/", pubDate: now - 8 * 86400000, extra: { ...second.extra, pinterest: { createdAt: now - 8 * 86400000 } } }
    const items = mergePinterestPins([updated], [old, second, expired])
    expect(items).toHaveLength(2)
    expect(items.find(item => item.id === old.id)?.extra?.pinterest?.aggregateSaves).toBe(20)
    expect(currentPinterestItems([old, expired])).toEqual([old])
  })

  it("honors a persisted rate-limit cooldown without sending discovery requests", async () => {
    stateTable.getState.mockResolvedValue({ cursor: 32, retryAt: now + 120000 })
    await expect(pinterest()).rejects.toThrow("cooling down")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("limits concurrent Pin requests and leaves the remaining queue untouched after a 429", async () => {
    stateTable.getState.mockResolvedValue({ cursor: 2, retryAt: 0 })
    const xml = `<rss><channel>${Array.from({ length: 6 }, (_, index) => `<item><title>Pin ${index}</title><link>https://news.google.com/rss/articles/CBMiqueue${index}?oc=5</link><source url="https://www.pinterest.com">Pinterest</source><pubDate>${new Date(now - 1000).toUTCString()}</pubDate></item>`).join("")}</channel></rss>`
    fetchMock.mockImplementation(async (input) => {
      const value = input.toString()
      if (value.includes("/rss/search?")) return xml as any
      if (value.includes("/rss/articles/")) {
        const id = new URL(value).pathname.split("/").at(-1)
        return `<div data-n-a-id="${id}" data-n-a-ts="1792830000" data-n-a-sg="abc-123"></div>` as any
      }
      if (value.includes("batchexecute")) return `)]}'\n${JSON.stringify(Array.from({ length: 6 }, (_, index) => ["wrb.fr", "Fbv4je", JSON.stringify(["garturlres", `https://www.pinterest.com/pin/${1234567890 + index}/`, 1]), null, null, null, String(index)]))}` as any
      throw Object.assign(new Error("Limited"), { statusCode: 429, response: { status: 429, headers: new Headers({ "Retry-After": "120" }) } })
    })
    await expect(pinterest()).rejects.toThrow("No valid public platform content")
    expect(fetchMock.mock.calls.filter(call => call[0].toString().startsWith("https://www.pinterest.com/pin/"))).toHaveLength(3)
    expect(fetchMock.mock.calls.find(call => call[0].toString().includes("/rss/articles/"))?.[0]).toContain("CBMiqueue2")
    expect(stateTable.setState).toHaveBeenLastCalledWith("pinterest-discovery", { cursor: 8, retryAt: now + 120000 })
  })
})
