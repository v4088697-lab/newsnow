import type { PropsWithChildren } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { LANGUAGE_KEY, loadLocale, persistLocale, resolveLocale, translate } from "@shared/i18n"
import type { Locale } from "@shared/i18n"

const LocaleContext = createContext<{
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (text: string, params?: Record<string, string | number>) => string
} | null>(null)

export function LocaleProvider({ children, initialLocale = "en" }: PropsWithChildren<{ initialLocale?: Locale }>) {
  const [locale, changeLocale] = useState<Locale>(initialLocale)
  const selection = useRef(0)
  const activateLocale = useCallback(async (next: Locale, persist: boolean) => {
    const currentSelection = ++selection.current
    try {
      await loadLocale(next)
      if (currentSelection !== selection.current) return
      changeLocale(next)
      if (persist) persistLocale(window.localStorage, next)
    } catch (error) {
      // Keep the readable current language if a language chunk cannot load.
      console.warn("Language could not be loaded", error)
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
  }, [locale])
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_KEY || event.key === null) void activateLocale(resolveLocale(event.newValue), false)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [activateLocale])
  const value = useMemo(() => ({
    locale,
    setLocale(next: Locale) {
      const safe = resolveLocale(next)
      void activateLocale(safe, true)
    },
    t: (text: string, params?: Record<string, string | number>) => translate(locale, text, params),
  }), [locale, activateLocale])
  return <LocaleContext value={value}>{children}</LocaleContext>
}
export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error("LocaleProvider is missing")
  return context
}
