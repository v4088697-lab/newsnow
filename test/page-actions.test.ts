import { describe, expect, it, vi } from "vitest"
import { getInstallInstructions, sharePage } from "../shared/page-actions"

const data = { title: "NewsNow", url: "https://example.com/c/hottest?source=tech#news" }

describe("share current page", () => {
  it("shares the supplied title and complete current URL", async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn()
    expect(await sharePage(data, { share, clipboard: { writeText } })).toBe("shared")
    expect(share).toHaveBeenCalledWith(data)
    expect(writeText).not.toHaveBeenCalled()
  })

  it("does not copy anything when native sharing is cancelled", async () => {
    const writeText = vi.fn()
    const browser = {
      share: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")),
      clipboard: { writeText },
    }
    expect(await sharePage(data, browser)).toBe("cancelled")
    expect(writeText).not.toHaveBeenCalled()
  })

  it.each([undefined, vi.fn().mockRejectedValue(new Error("Sharing unavailable"))])("copies the URL when native sharing is unavailable", async (share) => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(await sharePage(data, { share, clipboard: { writeText } })).toBe("copied")
    expect(writeText).toHaveBeenCalledWith(data.url)
  })

  it.each([undefined, { writeText: vi.fn().mockRejectedValue(new Error("Permission denied")) }])("offers a manual link when clipboard access is unavailable", async (clipboard) => {
    expect(await sharePage(data, { clipboard })).toBe("manual")
  })
})

describe("install instructions", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15", 5],
  ])("explains Add to Home Screen on iOS and iPadOS", (agent, touches) => {
    expect(getInstallInstructions(agent, touches)).toContain("Add to Home Screen")
    expect(getInstallInstructions(agent, touches)).toContain("Safari")
  })

  it("uses Android browser menu instructions", () => {
    expect(getInstallInstructions("Mozilla/5.0 (Linux; Android 15)", 5)).toContain("browser menu")
  })

  it("uses desktop installation instructions for Macs without a touchscreen", () => {
    expect(getInstallInstructions("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 0)).toContain("Chrome or Edge")
    expect(getInstallInstructions("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 0)).toContain("Add to Dock")
  })
})
