import { useEffect } from "react"
import { useLocation } from "@tanstack/react-router"
import type { FixedColumnID } from "@shared/types"
import { canonicalPath, localizedPageCopy, pageRobots } from "@shared/seo"
import { useLocale } from "~/i18n"

export function usePageSeo(column: FixedColumnID | "notFound") {
  const { pathname } = useLocation()
  const page = pathname === "/" ? "home" : column
  const { locale } = useLocale()
  useEffect(() => {
    const copy = localizedPageCopy(page, locale)
    document.title = copy.title
    const update = (selector: string, value: string) => document.querySelector(selector)?.setAttribute("content", value)
    update("meta[name='description']", copy.description)
    update("meta[name='robots']", pageRobots(page))
    update("meta[property='og:title']", copy.title)
    update("meta[name='twitter:title']", copy.title)
    update("meta[property='og:description']", copy.description)
    update("meta[name='twitter:description']", copy.description)
    if (page === "notFound") {
      document.querySelector("link[rel='canonical']")?.remove()
      document.querySelector("meta[property='og:url']")?.remove()
      document.querySelector("script[type='application/ld+json']")?.remove()
      return
    }
    const origin = document.documentElement.dataset.siteOrigin
    if (origin) {
      const canonical = document.querySelector<HTMLLinkElement>("link[rel='canonical']") ?? document.createElement("link")
      canonical.rel = "canonical"
      const url = `${origin}${canonicalPath(page)}`
      canonical.href = url
      if (!canonical.isConnected) document.head.append(canonical)
      const ogUrl = document.querySelector("meta[property='og:url']") ?? document.createElement("meta")
      ogUrl.setAttribute("property", "og:url")
      ogUrl.setAttribute("content", url)
      if (!ogUrl.isConnected) document.head.append(ogUrl)
      const schema = document.querySelector<HTMLScriptElement>("script[type='application/ld+json']") ?? document.createElement("script")
      schema.type = "application/ld+json"
      schema.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", "name": copy.title, "description": copy.description, url, "inLanguage": locale, "isPartOf": { "@type": "WebSite", "name": "NewsNow", "url": origin } })
      if (!schema.isConnected) document.head.append(schema)
    }
  }, [page, locale])
  return page
}
