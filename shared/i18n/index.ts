import en from "./en.json"
import zh from "./zh-CN.json"
import ja from "./ja.json"
import de from "./de.json"
import fr from "./fr.json"
import ar from "./ar.json"
import es from "./es.json"
import pt from "./pt.json"
import it from "./it.json"
import ko from "./ko.json"
import ru from "./ru.json"
import tr from "./tr.json"

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
export const dictionaries: Record<Locale, Record<string, string>> = { en, "zh-CN": zh, ja, de, fr, ar, es, pt, it, ko, ru, tr }
export const LANGUAGE_KEY = "newsnow-language"
export const defaultLocale: Locale = "en"
export function resolveLocale(value: unknown): Locale {
  return languages.find(item => item.code === value)?.code ?? defaultLocale
}
export function translate(locale: Locale, text: string, params: Record<string, string | number> = {}) {
  return (dictionaries[locale][text] ?? text).replace(/\{(\w+)\}/g, (match, key) => String(params[key] ?? match))
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
