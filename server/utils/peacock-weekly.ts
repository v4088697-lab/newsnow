import type { NewsItem } from "@shared/types"
import { isCurrentShowlabsCache, parseShowlabsWeekly } from "./showlabs-weekly"

export const PEACOCK_CHART = "https://www.showlabs.tv/en/peacock-top-10/united-states"
export const parsePeacockWeekly = (html: string, now = Date.now()) => parseShowlabsWeekly(html, "peacock", now)
export const isCurrentPeacockCache = (cache: { id: string, items: NewsItem[] }, now = Date.now()) => isCurrentShowlabsCache(cache, "peacock", now)
