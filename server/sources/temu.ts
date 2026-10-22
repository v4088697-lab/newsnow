import { myFetch } from "../utils/fetch"
import { parseTemuCategories, parseTemuReleases } from "../utils/shopping-content"
import { Version } from "../../shared/consts"

export default async () => {
  try {
    const html = await myFetch<string, "text">("https://www.temu.com/", { responseType: "text", retry: 0, timeout: 5000, headers: { "User-Agent": `NewsNow/${Version}` } })
    return parseTemuCategories(html)
  } catch {
    const html = await myFetch<string, "text">("https://www.prnewswire.com/news/temu/", { responseType: "text", retry: 0, timeout: 5000 })
    return parseTemuReleases(html)
  }
}
