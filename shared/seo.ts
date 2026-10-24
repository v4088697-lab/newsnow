import { metadata } from "./metadata"
import { sources } from "./sources"
import type { FixedColumnID } from "./types"
import { translate } from "./i18n"
import type { Locale } from "./i18n"

export const pageCopy = {
  home: {
    title: "News, Videos, Music & Game Recommendations | NewsNow",
    heading: "News and recommendations, in one place",
    description: "Explore news, videos, visual inspiration, rising songs and game guides from original sources. Follow your interests with NewsNow's simple, multilingual reader.",
  },
  hottest: {
    title: "Trending News & Recommendations | NewsNow",
    heading: "Trending news and recommendations",
    description: "Discover trending headlines, videos, music and game recommendations. Compare sources, explore weekly picks and open original stories with NewsNow.",
  },
  realtime: {
    title: "Latest News & Live Updates | NewsNow",
    heading: "Latest news and live updates",
    description: "Read recent headlines and updates from international news, technology and finance sources in one place. Open original reporting and follow the sources you trust.",
  },
  updated: {
    title: "New Sources & Weekly Picks | NewsNow",
    heading: "New sources and weekly recommendations",
    description: "Explore NewsNow's added sources: weekly video and image picks, rising songs, game guides, shopping and international news. Each card explains its recommendation scope.",
  },
  focus: {
    title: "Your Followed Sources | NewsNow",
    heading: "Your followed sources",
    description: "Build your personal NewsNow reading list. Follow news, video, music and game sources, then arrange them in the order you prefer.",
  },
  notFound: {
    title: "Page Not Found | NewsNow",
    heading: "Page not found",
    description: "This page is unavailable. Browse NewsNow's news and recommendation sources or return to the home page.",
  },
} as const
export type SeoPage = keyof typeof pageCopy
export function localizedPageCopy(page: SeoPage, locale: Locale) {
  const copy = pageCopy[page]
  if (locale === "en") return copy
  const heading = translate(locale, copy.heading)
  const description = `${heading}. ${translate(locale, "Read news, explore videos, music and game guides, and follow original sources in one simple reader.")}`
  return { heading, description, title: `${heading} | NewsNow` }
}
export const publicPaths = ["/", "/c/hottest", "/c/realtime", "/c/updated"] as const

export function pageForPath(pathname: string): SeoPage {
  const path = pathname.replace(/\/+$/, "") || "/"
  if (path === "/") return "home"
  const column = path.startsWith("/c/") ? path.slice(3) : ""
  return ["hottest", "realtime", "updated", "focus"].includes(column) ? column as FixedColumnID : "notFound"
}

export function siteOrigin(value?: string) {
  if (!value) return undefined
  const url = new URL(value)
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("SITE_URL must be a public http(s) origin without a path, query or credentials")
  if (/^(?:localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url.hostname)) throw new Error("SITE_URL must use the real public domain")
  return url.origin
}

export function canonicalPath(page: SeoPage) {
  return page === "home" || page === "hottest" ? "/" : `/c/${page}`
}

export function pageSources(page: SeoPage) {
  const column = page === "home" ? "hottest" : page
  return column in metadata ? metadata[column as FixedColumnID].sources.filter(id => sources[id] && !sources[id].redirect) : []
}

export function pageRobots(page: SeoPage) {
  return page === "focus" || page === "notFound" ? "noindex, follow" : "index, follow, max-image-preview:large"
}
