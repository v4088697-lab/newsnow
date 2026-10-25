const relativeFormats = new Map<string, Intl.RelativeTimeFormat>()
const dateFormats = new Map<string, Intl.DateTimeFormat>()
const numberFormats = new Map<string, Intl.NumberFormat>()

export function relativeTimeFormat(locale: string, numeric: "auto" | "always" = "auto") {
  const key = `${locale}:${numeric}`
  if (!relativeFormats.has(key)) relativeFormats.set(key, new Intl.RelativeTimeFormat(locale, { numeric }))
  return relativeFormats.get(key)!
}

export function shortDateFormat(locale: string) {
  if (!dateFormats.has(locale)) dateFormats.set(locale, new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }))
  return dateFormats.get(locale)!
}

export function numberFormat(locale: string) {
  if (!numberFormats.has(locale)) numberFormats.set(locale, new Intl.NumberFormat(locale))
  return numberFormats.get(locale)!
}
