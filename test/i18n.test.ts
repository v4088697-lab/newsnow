import { afterEach, describe, expect, it, vi } from "vitest"
import { LANGUAGE_KEY, dictionaries, languages, persistLocale, resolveLocale, savedLocale, translate } from "../shared/i18n"
import { localizeAnnotation, sourceDescription } from "../shared/i18n/content"
import { sources } from "../shared/sources"
import { metadata } from "../shared/metadata"
import { relativeTime } from "../shared/utils"
import { getInstallInstructions } from "../shared/page-actions"

describe("interface languages", () => {
  afterEach(() => vi.useRealTimers())

  it("defaults to English for missing, unsupported or inaccessible saved preferences", () => {
    expect(resolveLocale(undefined)).toBe("en")
    expect(resolveLocale("unsupported")).toBe("en")
    expect(savedLocale({ getItem: () => null })).toBe("en")
    expect(savedLocale({ getItem: () => {
      throw new Error("Storage blocked")
    } })).toBe("en")
  })

  it("supports twelve complete dictionaries with matching interpolation parameters", () => {
    expect(languages).toHaveLength(12)
    const keys = Object.keys(dictionaries.en).sort()
    for (const language of languages) {
      expect(Object.keys(dictionaries[language.code]).sort()).toEqual(keys)
      for (const key of keys) {
        const message = dictionaries[language.code][key]
        expect(message.trim()).not.toBe("")
        expect((message.match(/\{\w+\}/g) ?? []).sort()).toEqual((key.match(/\{\w+\}/g) ?? []).sort())
      }
    }
  })

  it("covers navigation, categories, current source subtitles and every install instruction", () => {
    const titles = [...Object.values(metadata).map(column => column.name), ...Object.values(sources).map(source => source.title).filter((title): title is string => !!title && title !== "Win11")]
    const help = [getInstallInstructions("iPhone", 5), getInstallInstructions("Android", 5), getInstallInstructions("Windows", 0)]
    for (const language of languages) {
      for (const message of [...titles, ...help]) expect(dictionaries[language.code][message]).toBeDefined()
    }
  })

  it("persists each selection and keeps switching usable when writes are blocked", () => {
    const data = new Map<string, string>()
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => {
      data.set(key, value)
    } }
    for (const language of languages) {
      persistLocale(storage, language.code)
      expect(data.get(LANGUAGE_KEY)).toBe(language.code)
      expect(savedLocale(storage)).toBe(language.code)
    }
    expect(() => persistLocale({ setItem: () => {
      throw new Error("Blocked")
    } }, "ar")).not.toThrow()
  })

  it("localizes live counters and ranks without modifying titles, URLs, dates or source IDs", () => {
    expect(localizeAnnotation("zh-CN", "Getting started · Google News date: 2026-10-15 · Google News")).toBe("新手入门 · Google News 日期: 2026-10-15 · Google News")
    expect(localizeAnnotation("ja", "↑18 places · 65→47 · Global public top 50 · 2026-10-09 to 2026-10-15")).toBe("↑18 · 65→47 · 世界の公開トップ50 · 2026-10-09 〜 2026-10-15")
    expect(localizeAnnotation("de", "12,345 views")).toBe("12.345 Aufrufe")
    expect(localizeAnnotation("zh-CN", "7-day indexed picks · Reel · 12,345 likes · Google News date: 2026-10-23")).toBe("近7天收录推荐 · 短视频 · 12,345 次点赞 · Google News 日期: 2026-10-23")
    expect(localizeAnnotation("zh-CN", "7-day video picks · 1,234 views · Uploaded 2d ago")).toBe("近7天视频推荐 · 1,234 次观看 · 发布于2天前")
    expect(localizeAnnotation("fr", "Publisher text & title")).toBe("Publisher text & title")
    expect(translate("zh-CN", "An original news headline")).toBe("An original news headline")
  })

  it("updates relative times and source scope text for every language", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-23T15:00:00Z"))
    for (const language of languages) {
      const time = relativeTime(Date.now() - 5 * 60000, language.code)
      expect(time).toBeTruthy()
      expect(translate(language.code, "Updated {time}", { time: time! })).not.toContain("{time}")
      expect(sourceDescription("spotify", sources.spotify.desc, language.code)).toBeTruthy()
    }
    expect(relativeTime(Date.now() - 60000, "zh-CN")).toBe("1分钟前")
    expect(relativeTime(Date.now() - 60000, "de")).toBe("vor 1 Minute")
    expect(sourceDescription("spotify", sources.spotify.desc, "en")).toBe(sources.spotify.desc)
    expect(sourceDescription("spotify", sources.spotify.desc, "zh-CN")).toContain("不是滚动 7 天")
  })
})
