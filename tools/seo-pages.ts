import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import process from "node:process"
import type { Plugin } from "vite"
import { load } from "cheerio"
import { canonicalPath, pageCopy, pageForPath, pageRobots, pageSources, publicPaths, siteOrigin } from "../shared/seo"
import type { SeoPage } from "../shared/seo"
import { sources } from "../shared/sources"
import { translate } from "../shared/i18n"

const escape = (text: string) => text.replace(/[&<>"']/g, value => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[value]!)

export function renderSeoPage(template: string, page: SeoPage, origin?: string) {
  const $ = load(template)
  const copy = pageCopy[page]
  if (origin) $("html").attr("data-site-origin", origin)
  $("title").text(copy.title)
  const meta = (key: string, content: string, property = false) => {
    const attr = property ? "property" : "name"
    $(`meta[${attr}='${key}']`).remove()
    $("head").append(`<meta ${attr}="${key}" content="${escape(content)}">`)
  }
  meta("description", copy.description)
  meta("robots", pageRobots(page))
  meta("og:title", copy.title, true)
  meta("og:description", copy.description, true)
  meta("twitter:title", copy.title)
  meta("twitter:description", copy.description)
  $("link[rel='canonical'], meta[property='og:url'], meta[property='og:image'], meta[name='twitter:image'], script[type='application/ld+json']").remove()
  if (origin && page !== "notFound") {
    const url = `${origin}${canonicalPath(page)}`
    $("head").append(`<link rel="canonical" href="${escape(url)}">`)
    meta("og:url", url, true)
    meta("og:image", `${origin}/og-image.png`, true)
    meta("twitter:image", `${origin}/og-image.png`)
    const schema = { "@context": "https://schema.org", "@type": "CollectionPage", "name": copy.title, "description": copy.description, url, "isPartOf": { "@type": "WebSite", "name": "NewsNow", "url": origin } }
    $("head").append(`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`)
  }
  const nav = [["/c/hottest", "Trending"], ["/c/realtime", "Live"], ["/c/updated", "Updates"], ["/c/focus", "Following"]].map(([href, label]) => `<a href="${href}">${label}</a>`).join("")
  const directory = pageSources(page).map((id) => {
    const source = sources[id]
    return `<li><a href="${escape(source.home ?? "/")}" rel="noopener noreferrer" target="_blank">${escape(source.name)}</a>${source.title ? `<span> — ${escape(translate("en", source.title))}</span>` : ""}</li>`
  }).join("")
  $("#app").html(`<div class="static-page"><header><a href="/" class="static-brand">NewsNow</a><nav aria-label="News navigation">${nav}</nav></header><main id="main-content" tabindex="-1"><section class="page-intro"><h1>${escape(copy.heading)}</h1><p>${escape(copy.description)}</p></section>${directory ? `<section class="source-directory"><h2>Explore sources</h2><p>Open original sources below. Enable JavaScript for live headlines, recommendations, following and language switching.</p><ul>${directory}</ul></section>` : `<p><a href="/">Back to home</a></p>`}</main><footer>NewsNow · Headlines link to the original publisher. Some content may require a subscription.</footer></div>`)
  return $.html()
}

export function seoPages(): Plugin {
  let outDir = ""
  return {
    name: "newsnow-seo-pages",
    configResolved(config) {
      outDir = config.build.outDir
    },
    writeBundle: {
      sequential: true,
      async handler() {
        const template = await readFile(join(outDir, "index.html"), "utf8")
        const origin = siteOrigin(process.env.SITE_URL)
        for (const path of [...publicPaths, "/c/focus", "/404"]) {
          const page = path === "/404" ? "notFound" : pageForPath(path)
          const file = path === "/" ? "index.html" : path === "/404" ? "404.html" : `${path.slice(1)}/index.html`
          await mkdir(join(outDir, file, ".."), { recursive: true })
          await writeFile(join(outDir, file), renderSeoPage(template, page, origin))
        }
        const robots = `User-agent: *\nAllow: /\nDisallow: /api/\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ""}`
        await writeFile(join(outDir, "robots.txt"), robots)
        if (origin) {
          const paths = publicPaths.filter(path => path !== "/c/hottest")
          await writeFile(join(outDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${escape(origin + path)}</loc></url>`).join("")}</urlset>`)
        }
      },
    },
  }
}
