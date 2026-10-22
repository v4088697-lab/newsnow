import type { SourceID, SourceResponse } from "@shared/types"
import { defineEventHandler, readBody } from "h3"
import { sources } from "@shared/sources"
import { getCacheTable } from "#/database/cache"
import { isCurrentTikTokCache } from "#/utils/tiktok-trends"

export default defineEventHandler(async (event) => {
  try {
    const { sources: _ }: { sources: SourceID[] } = await readBody(event)
    const cacheTable = await getCacheTable()
    const ids = _?.filter(k => sources[k])
    if (ids?.length && cacheTable) {
      const caches = await cacheTable.getEntire(ids)
      return caches.filter(isCurrentTikTokCache).map(cache => ({
        status: "cache",
        id: cache.id,
        items: cache.items,
        updatedTime: cache.updated,
      })) as SourceResponse[]
    }
  } catch {
    //
  }
})
