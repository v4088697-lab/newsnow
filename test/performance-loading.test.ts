import { describe, expect, it, vi } from "vitest"
import { numberFormat, relativeTimeFormat, shortDateFormat } from "../shared/intl"

describe("on-demand interface resources", () => {
  it("starts with English and shares concurrent requests for a selected language", async () => {
    vi.resetModules()
    const i18n = await import("../shared/i18n")
    expect(Object.keys(i18n.dictionaries)).toEqual(["en"])
    const first = i18n.loadLocale("de")
    const second = i18n.loadLocale("de")
    expect(first).toBe(second)
    await first
    expect(i18n.translate("de", "Language")).toBe("Sprache")
    expect(i18n.dictionaries.ja).toBeUndefined()
    await i18n.loadLocale("de")
    expect(Object.keys(i18n.dictionaries).sort()).toEqual(["de", "en"])
  })

  it("keeps English text and interpolation available before another dictionary loads", async () => {
    vi.resetModules()
    const i18n = await import("../shared/i18n")
    expect(i18n.translate("ja", "Updated {time}", { time: "5 min ago" })).toBe("Updated 5 min ago")
  })

  it("reuses formatters while keeping languages and relative-time styles distinct", () => {
    expect(relativeTimeFormat("de")).toBe(relativeTimeFormat("de"))
    expect(relativeTimeFormat("de", "always")).not.toBe(relativeTimeFormat("de"))
    expect(relativeTimeFormat("de")).not.toBe(relativeTimeFormat("ar"))
    expect(shortDateFormat("ja")).toBe(shortDateFormat("ja"))
    expect(numberFormat("de")).toBe(numberFormat("de"))
    expect(numberFormat("de").format(12345)).toBe("12.345")
  })
})
