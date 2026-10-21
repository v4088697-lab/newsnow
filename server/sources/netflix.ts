import { myFetch } from "../utils/fetch"
import { parseNetflixChart } from "../utils/netflix-chart"

export default async () => {
  const tsv = await myFetch<string, "text">("https://www.netflix.com/tudum/top10/data/all-weeks-global.tsv", {
    responseType: "text",
    retry: 0,
    timeout: 8000,
  })
  return parseNetflixChart(tsv)
}
