import { parsePublicLinks, requireItems } from "./platform-content"

export function parseParamountReleases(html: string) {
  return parsePublicLinks(html, {
    base: "https://www.paramountpressexpress.com/paramount-plus/releases/",
    selector: "a.release-link[href*=\"?view=\"]",
    titleSelector: ".release-title",
    path: /^\/paramount-plus\/(?:shows\/[^/]+\/)?releases\/$/,
    label: "官方动态",
  })
}

export function parsePeacockRecommendations(html: string) {
  const options = {
    base: "https://www.peacocktv.com/blog",
    titleSelector: ".headline",
    path: /^\/blog\/[^/]+\/?$/,
  }
  let popular: ReturnType<typeof parsePublicLinks> = []
  try {
    popular = parsePublicLinks(html, { ...options, selector: ".teaser--microsite-most-popular a", label: "官方博客热门" })
  } catch { /* The recommendation section may still be available. */ }
  let recommended: ReturnType<typeof parsePublicLinks> = []
  try {
    recommended = parsePublicLinks(html, { ...options, selector: "a[href*=\"/blog/\"]", label: "官方推荐" })
  } catch { /* Keep valid popular articles if the remaining sections are unavailable. */ }
  return requireItems([...popular, ...recommended])
}
