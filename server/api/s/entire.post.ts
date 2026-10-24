import type { SourceID, SourceResponse } from "@shared/types"
import { defineEventHandler, readBody } from "h3"
import { sources } from "@shared/sources"
import { getCacheTable } from "#/database/cache"
import { isCurrentTikTokCache } from "#/utils/tiktok-trends"
import { englishCacheItems } from "#/utils/english-cache"
import { isCurrentYouTubeCache } from "#/utils/youtube-videos"
import { isCurrentInstagramCache } from "#/utils/instagram-posts"
import { isCurrentFacebookCache } from "#/utils/facebook-posts"
import { isCurrentPinterestCache } from "#/utils/pinterest-content"

export default defineEventHandler(async (event) => {
  try {
    const { sources: _ }: { sources: SourceID[] } = await readBody(event)
    const cacheTable = await getCacheTable()
    const ids = _?.filter(k => sources[k])
    if (ids?.length && cacheTable) {
      const caches = await cacheTable.getEntire(ids)
      return caches.filter(cache => isCurrentTikTokCache(cache) && isCurrentYouTubeCache(cache) && isCurrentInstagramCache(cache) && isCurrentFacebookCache(cache) && isCurrentPinterestCache(cache)).map(cache => ({
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
