import { fetchPublicLinks } from "../utils/platform-content"
import { kickUpdates } from "../utils/platform-updates"
import { Version } from "../../shared/consts"

export default async () => {
  try {
    return await fetchPublicLinks("https://kick.com/browse/categories", {
      selector: "a[href^=\"/category/\"]",
      titleSelector: "h3",
      path: /^\/category\/[^/]+\/?$/,
      label: "公开直播分类",
    }, { "User-Agent": `NewsNow/${Version}` })
  } catch {
    return kickUpdates()
  }
}
