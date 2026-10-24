import type { SourceID, SourceResponse } from "@shared/types"
import { createError, defineEventHandler, getQuery } from "h3"
import { sources } from "@shared/sources"
import { getters } from "#/getters"
import { getCacheTable } from "#/database/cache"
import type { CacheInfo } from "#/types"
import { isCurrentTikTokCache } from "#/utils/tiktok-trends"
import { englishCacheItems } from "#/utils/english-cache"
import { isCurrentYouTubeCache } from "#/utils/youtube-videos"
import { isCurrentInstagramCache } from "#/utils/instagram-posts"
import { isCurrentFacebookCache } from "#/utils/facebook-posts"

const info = {
  LICENCE: "MIT",
  Github: "https://github.com/ourongxing/newsnow",
  Sponsorship: "If you rely on this service, sponsorship is welcome to help it run for the long term. Scan the QR code https://raw.githubusercontent.com/ourongxing/newsnow/main/screenshots/reward.gif",
}

export default defineEventHandler(async (event): Promise<SourceResponse> => {
  try {
    const query = getQuery(event)
    let id = query.id as SourceID
    const isValid = (id: SourceID) => !id || !sources[id] || !getters[id]

    if (isValid(id)) {
      const redirectID = sources?.[id]?.redirect
      if (redirectID) id = redirectID
      if (isValid(id)) throw new Error("Invalid source id")
    }

    const cacheTable = await getCacheTable()
    // Date.now() in Cloudflare Worker will not update throughout the entire runtime.
    const now = Date.now()
    let cache: CacheInfo | undefined
    if (cacheTable) {
      cache = await cacheTable.get(id)
      if (cache && (!isCurrentTikTokCache(cache) || !isCurrentYouTubeCache(cache, now) || !isCurrentInstagramCache(cache, now) || !isCurrentFacebookCache(cache, now))) cache = undefined
      // Automatic requests obey the source interval, without an extra 30-minute cache floor.
      if (cache && now - cache.updated < sources[id].interval) {
        return {
          status: "cache",
          id,
          updatedTime: cache.updated,
          items: englishCacheItems(cache.items),
          info,
        }
      }
    }

    try {
      const newData = (await getters[id]()).slice(0, 30)
      const updatedTime = Date.now()
      if (cacheTable && newData.length) {
        if (event.context.waitUntil) event.context.waitUntil(cacheTable.set(id, newData, updatedTime))
        else await cacheTable.set(id, newData, updatedTime)
      }
      logger.success(`fetch ${id} latest`)
      return {
        status: "success",
        id,
        updatedTime,
        items: newData,
        info,
      }
    } catch (e) {
      if (cache!) {
        return {
          status: "cache",
          id,
          updatedTime: cache.updated,
          items: englishCacheItems(cache.items),
          info,
        }
      } else {
        throw e
      }
    }
  } catch (e: any) {
    logger.error(e)
    throw createError({
      statusCode: 500,
      message: e instanceof Error ? e.message : "Internal Server Error",
    })
  }
})
