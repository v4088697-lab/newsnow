import en from "./en.json"

export const languages = [
  { code: "en", label: "English", short: "EN" },
  { code: "zh-CN", label: "简体中文", short: "中" },
  { code: "ja", label: "日本語", short: "JA" },
  { code: "de", label: "Deutsch", short: "DE" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "ar", label: "العربية", short: "AR" },
  { code: "es", label: "Español", short: "ES" },
  { code: "pt", label: "Português", short: "PT" },
  { code: "it", label: "Italiano", short: "IT" },
  { code: "ko", label: "한국어", short: "KO" },
  { code: "ru", label: "Русский", short: "RU" },
  { code: "tr", label: "Türkçe", short: "TR" },
] as const
export type Locale = typeof languages[number]["code"]
export const dictionaries: Partial<Record<Locale, Record<string, string>>> = { en }
const loaders = {
  "zh-CN": () => import("./zh-CN.json"),
  "ja": () => import("./ja.json"),
  "de": () => import("./de.json"),
  "fr": () => import("./fr.json"),
  "ar": () => import("./ar.json"),
  "es": () => import("./es.json"),
  "pt": () => import("./pt.json"),
  "it": () => import("./it.json"),
  "ko": () => import("./ko.json"),
  "ru": () => import("./ru.json"),
  "tr": () => import("./tr.json"),
}
const pending = new Map<Locale, Promise<void>>()

export function loadLocale(locale: Locale): Promise<void> {
  if (dictionaries[locale]) return Promise.resolve()
  const existing = pending.get(locale)
  if (existing) return existing
  const request = loaders[locale as keyof typeof loaders]().then((module) => {
    dictionaries[locale] = module.default
    pending.delete(locale)
  }).catch((error) => {
    pending.delete(locale)
    throw error
  })
  pending.set(locale, request)
  return request
}
export const LANGUAGE_KEY = "newsnow-language"
export const defaultLocale: Locale = "en"
export function resolveLocale(value: unknown): Locale {
  return languages.find(item => item.code === value)?.code ?? defaultLocale
}
export function translate(locale: Locale, text: string, params: Record<string, string | number> = {}) {
  return (dictionaries[locale]?.[text] ?? en[text as keyof typeof en] ?? text).replace(/\{(\w+)\}/g, (match, key) => String(params[key] ?? match))
}
export function savedLocale(storage?: Pick<Storage, "getItem">): Locale {
  try {
    return resolveLocale(storage?.getItem(LANGUAGE_KEY))
  } catch {
    return defaultLocale
  }
}
export function persistLocale(storage: Pick<Storage, "setItem"> | undefined, locale: Locale) {
  try {
    storage?.setItem(LANGUAGE_KEY, locale)
  } catch { /* A blocked storage must not prevent switching. */ }
}
