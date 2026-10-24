import pages from "#newsnow-pages"

// The renderer serves route documents and a real 404 for unknown paths.
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname.replace(/\/+$/, "") || "/"
  const page = pages[path]
  setHeader(event, "Content-Type", "text/html; charset=utf-8")
  setHeader(event, "Cache-Control", "no-cache")
  if (page) return page
  setResponseStatus(event, 404)
  return pages["/404"]
})
