export function relativeTime(timestamp: string | number, locale = "en") {
  if (!timestamp) return undefined
  const date = new Date(timestamp)
  if (Number.isNaN(date.getDay())) return undefined

  const now = new Date()
  const diffInSeconds = (now.getTime() - date.getTime()) / 1000
  const diffInMinutes = diffInSeconds / 60
  const diffInHours = diffInMinutes / 60
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

  if (diffInSeconds < 60) {
    return locale === "en" ? "just now" : format.format(0, "second")
  } else if (diffInMinutes < 60) {
    const minutes = Math.floor(diffInMinutes)
    return locale === "en" ? `${minutes} min ago` : format.format(-minutes, "minute")
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours)
    return locale === "en" ? `${hours} hr ago` : format.format(-hours, "hour")
  } else {
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date)
  }
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function randomUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function randomItem<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}
