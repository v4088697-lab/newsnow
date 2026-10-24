import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { SourceResponse } from "../../shared/types"
import { cacheSources, refetchSources } from "./data"
import { sourceQueryOptions } from "./source-query"
import { myFetch } from "./index"

vi.mock("./index", () => ({ myFetch: vi.fn(), safeParseString: (value: string | null) => value ? JSON.parse(value) : "" }))
vi.hoisted(() => vi.stubGlobal("window", new EventTarget()))

const fetchMock = vi.mocked(myFetch)
const snapshot = (title: string, time = Date.now()): SourceResponse => ({ id: "cnn", status: "success", updatedTime: time, items: [{ id: title, title, url: "https://www.cnn.com/news" }] })

describe("automatic source queries", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal("window", new EventTarget())
    vi.stubGlobal("localStorage", { getItem: () => null })
    cacheSources.clear()
    refetchSources.clear()
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("fetches changed content on every configured interval despite memory data", async () => {
    const { QueryClient, QueryObserver, focusManager } = await import("@tanstack/react-query")
    const client = new QueryClient()
    focusManager.setFocused(true)
    fetchMock.mockResolvedValueOnce(snapshot("Initial")).mockResolvedValueOnce(snapshot("Changed"))
    const options = sourceQueryOptions("cnn")
    const observer = new QueryObserver(client, options)
    const unsubscribe = observer.subscribe(() => {})
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(options.refetchInterval as number)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(observer.getCurrentResult().data?.items[0].title).toBe("Changed")
    unsubscribe()
    client.clear()
    focusManager.setFocused(undefined)
  })

  it("refetches expired memory data as soon as a card mounts", async () => {
    const { QueryClient, QueryObserver } = await import("@tanstack/react-query")
    cacheSources.set("cnn", snapshot("Old", Date.now() - 60 * 60 * 1000))
    fetchMock.mockResolvedValueOnce(snapshot("Fresh"))
    const client = new QueryClient()
    const observer = new QueryObserver(client, sourceQueryOptions("cnn"))
    const unsubscribe = observer.subscribe(() => {})
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(observer.getCurrentResult().data?.items[0].title).toBe("Fresh")
    unsubscribe()
    client.clear()
  })

  it("fills Pinterest every minute until ten Pins are available, then returns to its normal interval", async () => {
    const { QueryClient, QueryObserver, focusManager } = await import("@tanstack/react-query")
    const pins = (count: number): SourceResponse => ({ id: "pinterest", status: "success", updatedTime: Date.now(), items: Array.from({ length: count }, (_, index) => ({ id: String(index), title: `Pin ${index}`, url: `https://www.pinterest.com/pin/${1234567890 + index}/` })) })
    fetchMock.mockResolvedValue(pins(10)).mockResolvedValueOnce(pins(3))
    focusManager.setFocused(true)
    const client = new QueryClient()
    const observer = new QueryObserver(client, sourceQueryOptions("pinterest"))
    const unsubscribe = observer.subscribe(() => {})
    await vi.advanceTimersByTimeAsync(0)
    expect(observer.getCurrentResult().data?.items).toHaveLength(3)
    await vi.advanceTimersByTimeAsync(60000)
    expect(observer.getCurrentResult().data?.items).toHaveLength(10)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(60000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    unsubscribe()
    client.clear()
    focusManager.setFocused(undefined)
  })

  it("does not mix Spotify weekly rank gains with changes since the last page request", async () => {
    const { QueryClient } = await import("@tanstack/react-query")
    cacheSources.set("spotify", { id: "spotify", status: "cache", updatedTime: Date.now(), items: [{ id: "a", title: "A", url: "https://open.spotify.com/track/a" }, { id: "b", title: "B", url: "https://open.spotify.com/track/b" }] })
    fetchMock.mockResolvedValueOnce({ id: "spotify", status: "success", updatedTime: Date.now(), items: [{ id: "b", title: "B", url: "https://open.spotify.com/track/b", extra: { info: "↑18 places · 65→47" } }] })
    const client = new QueryClient()
    const result = await client.fetchQuery({ ...sourceQueryOptions("spotify"), staleTime: 0 })
    expect(result.items[0].extra?.info).toBe("↑18 places · 65→47")
    expect(result.items[0].extra?.diff).toBeUndefined()
    client.clear()
  })

  it("does not imply Quora engagement-rank changes when discovery order changes", async () => {
    const { QueryClient } = await import("@tanstack/react-query")
    const first = { id: "a", title: "What is the first topic?", url: "https://www.quora.com/What-is-the-first-topic" }
    const second = { id: "b", title: "What is the second topic?", url: "https://www.quora.com/What-is-the-second-topic" }
    cacheSources.set("quora", { id: "quora", status: "cache", updatedTime: Date.now(), items: [first, second] })
    fetchMock.mockResolvedValueOnce({ id: "quora", status: "success", updatedTime: Date.now(), items: [second, first] })
    const client = new QueryClient()
    const result = await client.fetchQuery({ ...sourceQueryOptions("quora"), staleTime: 0 })
    expect(result.items.every(item => item.extra?.diff === undefined)).toBe(true)
    client.clear()
  })

  it("refreshes on reconnect and returning to the page while pausing hidden polling", async () => {
    const { QueryClient, QueryObserver, focusManager, onlineManager } = await import("@tanstack/react-query")
    cacheSources.set("cnn", snapshot("Cached"))
    const client = new QueryClient()
    client.mount()
    const options = sourceQueryOptions("cnn")
    const observer = new QueryObserver(client, options)
    const unsubscribe = observer.subscribe(() => {})
    focusManager.setFocused(false)
    await vi.advanceTimersByTimeAsync(options.refetchInterval as number)
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockResolvedValue(snapshot("Returned"))
    focusManager.setFocused(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    onlineManager.setOnline(false)
    onlineManager.setOnline(true)
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    unsubscribe()
    client.unmount()
    client.clear()
    focusManager.setFocused(undefined)
  })
})
