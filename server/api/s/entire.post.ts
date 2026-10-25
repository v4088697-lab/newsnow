import type { SourceID, SourceResponse } from "@shared/types"
import { defineEventHandler, readBody } from "h3"
import { sources } from "@shared/sources"
import { getCacheTable } from "#/database/cache"
import { isCurrentTikTokCache } from "#/utils/tiktok-trends"
import { englishCacheItems } from "#/utils/english-cache"
import { isCurrentYouTubeCache } from "#/utils/youtube-videos"
import { isCurrentInstagramCache } from "#/utils/instagram-posts"
import { isCurrentFacebookCache } from "#/utils/facebook-posts"
import { currentPinterestItems, isCurrentPinterestCache } from "#/utils/pinterest-content"
import { currentQuoraItems, isCurrentQuoraCache } from "#/utils/quora-topics"
import { currentXItems, isCurrentXCache } from "#/utils/x-topics"
import { isCurrentRumbleCache } from "#/utils/rumble-content"
import { isCurrentParamountCache } from "#/utils/paramount-risers"
import { isCurrentPeacockCache } from "#/utils/peacock-weekly"
import { isCurrentDisneyCache } from "#/utils/disney-weekly"

export default defineEventHandler(async (event) => {
  try {
    const { sources: _ }: { sources: SourceID[] } = await readBody(event)
    const cacheTable = await getCacheTable()
    const ids = _?.filter(k => sources[k])
    if (ids?.length && cacheTable) {
      const caches = await cacheTable.getEntire(ids)
      return caches.map(cache => cache.id === "pinterest" ? { ...cache, items: currentPinterestItems(cache.items) } : cache.id === "quora" ? { ...cache, items: currentQuoraItems(cache.items) } : cache.id === "x" ? { ...cache, items: currentXItems(cache.items) } : cache)
        .filter(cache => isCurrentTikTokCache(cache) && isCurrentYouTubeCache(cache) && isCurrentInstagramCache(cache) && isCurrentFacebookCache(cache) && isCurrentPinterestCache(cache) && isCurrentQuoraCache(cache) && isCurrentXCache(cache) && isCurrentRumbleCache(cache) && isCurrentParamountCache(cache) && isCurrentPeacockCache(cache) && isCurrentDisneyCache(cache))
        .map(cache => ({
          status: "cache",
          id: cache.id,
          items: englishCacheItems(cache.items),
          updatedTime: cache.updated,
        })) as SourceResponse[]
    }
  } catch {
    //
  }
})
