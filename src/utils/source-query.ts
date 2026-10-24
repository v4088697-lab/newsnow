import { queryOptions } from "@tanstack/react-query"
import type { SourceID, SourceResponse } from "@shared/types"
import { sources } from "@shared/sources"
import { cacheSources, refetchSources } from "./data"
import { myFetch, safeParseString } from "./index"

export function sourceQueryOptions(id: SourceID) {
  const interval = sources[id].interval
  return queryOptions({
    queryKey: ["source", id],
    queryFn: async (): Promise<SourceResponse> => {
      let url = `/s?id=${id}`
      const headers: Record<string, string> = {}
      if (refetchSources.has(id)) {
        url += "&latest"
        const jwt = safeParseString(localStorage.getItem("jwt"))
        if (jwt) headers.Authorization = `Bearer ${jwt}`
        refetchSources.delete(id)
      }
      // Memory data seeds the query once; every actual refresh must reach the API.
      const response = await myFetch<SourceResponse>(url, { headers })
      const previous = cacheSources.get(id)
      if (sources[id].type === "hottest" && !["spotify", "youtube", "instagram", "facebook", "pinterest", "quora"].includes(id) && previous) {
        response.items.forEach((item, index) => {
          const oldIndex = previous.items.findIndex(old => old.id === item.id)
          item.extra = { ...item.extra, diff: oldIndex === -1 ? undefined : oldIndex - index }
        })
      }
      cacheSources.set(id, response)
      return response
    },
    initialData: () => cacheSources.get(id),
    initialDataUpdatedAt: () => Number(cacheSources.get(id)?.updatedTime) || 0,
    staleTime: interval,
    refetchInterval: ["pinterest", "quora"].includes(id) ? query => (query.state.data?.items.length ?? 0) < 10 ? 60000 : interval : interval,
    refetchIntervalInBackground: false,
    refetchOnMount: true,
    refetchOnReconnect: "always",
    refetchOnWindowFocus: "always",
    retry: false,
  })
}
