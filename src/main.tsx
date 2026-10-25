import ReactDOM from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { loadLocale, savedLocale } from "@shared/i18n"
import { routeTree } from "./routeTree.gen"
import "./utils/pwa"
import { LocaleProvider } from "./i18n"

const queryClient = new QueryClient()

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
})

const rootElement = document.getElementById("app")!

// The initial HTML contains a readable source directory before React starts.
async function start() {
  let locale = savedLocale()
  try {
    locale = savedLocale(window.localStorage)
    await loadLocale(locale)
  } catch {
    locale = "en"
  }
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <LocaleProvider initialLocale={locale}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </LocaleProvider>,
  )
}
void start()

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
