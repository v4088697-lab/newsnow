import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { RegisterSWOptions } from "vite-plugin-pwa/types"

const mocks = vi.hoisted(() => ({ register: vi.fn(), apply: vi.fn() }))
vi.mock("virtual:pwa-register", () => ({ registerSW: mocks.register }))

function storage() {
  const entries = new Map<string, string>()
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value), removeItem: (key: string) => entries.delete(key) }
}

describe("automatic website version updates", () => {
  let callbacks: RegisterSWOptions
  let browserWindow: EventTarget
  let browserDocument: EventTarget & { visibilityState: string }
  let browserNavigator: { onLine: boolean }
  let local: ReturnType<typeof storage>
  let session: ReturnType<typeof storage>

  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    local = storage()
    session = storage()
    browserWindow = new EventTarget()
    browserDocument = Object.assign(new EventTarget(), { visibilityState: "visible" })
    browserNavigator = { onLine: true }
    vi.stubGlobal("window", browserWindow)
    vi.stubGlobal("document", browserDocument)
    vi.stubGlobal("navigator", browserNavigator)
    vi.stubGlobal("localStorage", local)
    vi.stubGlobal("sessionStorage", session)
    mocks.apply.mockReset().mockResolvedValue(undefined)
    mocks.register.mockReset().mockImplementation((options: RegisterSWOptions) => {
      callbacks = options
      return mocks.apply
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("applies a detected version after five seconds without a toast dismissal", async () => {
    const lifecycle = await import("./pwa")
    const states: string[] = []
    lifecycle.subscribePwaUpdateState(state => states.push(state))
    callbacks.onNeedRefresh!()
    await vi.advanceTimersByTimeAsync(4999)
    expect(mocks.apply).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(mocks.apply).toHaveBeenCalledExactlyOnceWith(true)
    expect(states).toEqual(["idle", "ready", "applying"])
  })

  it("cancels the automatic timer when the user applies the update immediately", async () => {
    const lifecycle = await import("./pwa")
    callbacks.onNeedRefresh!()
    await lifecycle.applyPwaUpdate()
    await vi.advanceTimersByTimeAsync(5000)
    expect(mocks.apply).toHaveBeenCalledTimes(1)
  })

  it("retains a failed update for retry instead of reporting success", async () => {
    const lifecycle = await import("./pwa")
    mocks.apply.mockRejectedValueOnce(new Error("Update unavailable"))
    callbacks.onNeedRefresh!()
    await expect(lifecycle.applyPwaUpdate()).rejects.toThrow("Update unavailable")
    expect(local.getItem("newsnow:pwa-update-pending")).toBe("true")
    expect(session.getItem("newsnow:pwa-update-successful")).toBeNull()
    const listener = vi.fn()
    lifecycle.subscribePwaUpdateState(listener)
    expect(listener).toHaveBeenCalledWith("ready")
    await lifecycle.applyPwaUpdate()
    expect(mocks.apply).toHaveBeenCalledTimes(2)
  })

  it("checks every five minutes and resumes checking after visibility or connectivity returns", async () => {
    await import("./pwa")
    const update = vi.fn().mockResolvedValue(undefined)
    callbacks.onRegisteredSW!("/swx.js", { update } as unknown as ServiceWorkerRegistration)
    await vi.advanceTimersByTimeAsync(0)
    expect(update).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    expect(update).toHaveBeenCalledTimes(2)
    browserDocument.visibilityState = "hidden"
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    expect(update).toHaveBeenCalledTimes(2)
    browserDocument.visibilityState = "visible"
    browserDocument.dispatchEvent(new Event("visibilitychange"))
    await vi.advanceTimersByTimeAsync(0)
    expect(update).toHaveBeenCalledTimes(3)
    browserNavigator.onLine = false
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    browserNavigator.onLine = true
    browserWindow.dispatchEvent(new Event("online"))
    await vi.advanceTimersByTimeAsync(0)
    expect(update).toHaveBeenCalledTimes(4)
    browserWindow.dispatchEvent(new Event("focus"))
    expect(update).toHaveBeenCalledTimes(4)
  })

  it("retries a previously pending version when it is detected after reopening", async () => {
    local.setItem("newsnow:pwa-update-pending", "true")
    await import("./pwa")
    callbacks.onNeedRefresh!()
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.apply).toHaveBeenCalledExactlyOnceWith(true)
  })

  it("retries an interrupted installation after the network returns", async () => {
    await import("./pwa")
    vi.spyOn(console, "warn").mockImplementation(() => {})
    callbacks.onRegisteredSW!("/swx.js", { update: vi.fn().mockResolvedValue(undefined) } as unknown as ServiceWorkerRegistration)
    await vi.advanceTimersByTimeAsync(0)
    mocks.apply.mockRejectedValueOnce(new Error("Interrupted"))
    callbacks.onNeedRefresh!()
    await vi.advanceTimersByTimeAsync(5000)
    expect(mocks.apply).toHaveBeenCalledTimes(1)
    browserNavigator.onLine = false
    await vi.advanceTimersByTimeAsync(30000)
    browserNavigator.onLine = true
    browserWindow.dispatchEvent(new Event("online"))
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.apply).toHaveBeenCalledTimes(2)
  })

  it("confirms a successful version after the page has reloaded", async () => {
    session.setItem("newsnow:pwa-update-successful", "true")
    const lifecycle = await import("./pwa")
    const listener = vi.fn()
    lifecycle.subscribePwaUpdateState(listener)
    expect(listener).toHaveBeenCalledWith("successful")
    expect(session.getItem("newsnow:pwa-update-successful")).toBeNull()
  })
})
