import { parsePublicLinks, requireItems } from "./platform-content"

export function parseParamountReleases(html: string) {
  return parsePublicLinks(html, {
    base: "https://www.paramountpressexpress.com/paramount-plus/releases/",
    selector: "a.release-link[href*=\"?view=\"]",
    titleSelector: ".release-title",
    path: /^\/paramount-plus\/(?:shows\/[^/]+\/)?releases\/$/,
    label: "Official updates",
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
    popular = parsePublicLinks(html, { ...options, selector: ".teaser--microsite-most-popular a", label: "Popular on the official blog" })
  } catch { /* The recommendation section may still be available. */ }
  let recommended: ReturnType<typeof parsePublicLinks> = []
  try {
    recommended = parsePublicLinks(html, { ...options, selector: "a[href*=\"/blog/\"]", label: "Official recommendations" })
  } catch { /* Keep valid popular articles if the remaining sections are unavailable. */ }
  return requireItems([...popular, ...recommended])
}
