import type { PropsWithChildren } from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { LANGUAGE_KEY, persistLocale, resolveLocale, savedLocale, translate } from "@shared/i18n"
import type { Locale } from "@shared/i18n"

const LocaleContext = createContext<{
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (text: string, params?: Record<string, string | number>) => string
} | null>(null)

function initialLocale() {
  try {
    return savedLocale(window.localStorage)
  } catch {
    return resolveLocale(undefined)
  }
}
export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, changeLocale] = useState<Locale>(initialLocale)
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
  }, [locale])
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_KEY || event.key === null) changeLocale(resolveLocale(event.newValue))
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])
  const value = useMemo(() => ({
    locale,
    setLocale(next: Locale) {
      const safe = resolveLocale(next)
      changeLocale(safe)
      try {
        persistLocale(window.localStorage, safe)
      } catch { /* Browser storage can be unavailable. */ }
    },
    t: (text: string, params?: Record<string, string | number>) => translate(locale, text, params),
  }), [locale])
  return <LocaleContext value={value}>{children}</LocaleContext>
}
export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error("LocaleProvider is missing")
  return context
}
