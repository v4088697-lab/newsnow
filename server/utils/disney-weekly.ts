import type { NewsItem } from "@shared/types"
import { isCurrentShowlabsCache, parseShowlabsWeekly } from "./showlabs-weekly"

export const DISNEY_CHART = "https://www.showlabs.tv/en/disney-top-10/united-states"
export const parseDisneyWeekly = (html: string, now = Date.now()) => parseShowlabsWeekly(html, "disneyplus", now)
export const isCurrentDisneyCache = (cache: { id: string, items: NewsItem[] }, now = Date.now()) => isCurrentShowlabsCache(cache, "disneyplus", now)
