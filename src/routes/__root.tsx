import "~/styles/globals.css"
import "virtual:uno.css"
import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router"
import { Suspense, lazy } from "react"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import type { QueryClient } from "@tanstack/react-query"
import { isMobile } from "react-device-detect"
import { Header } from "~/components/header"
import { GlobalOverlayScrollbar } from "~/components/common/overlay-scrollbar"
import { Footer } from "~/components/footer"
import { Toast } from "~/components/common/toast"
import { useLocale } from "~/i18n"
import { usePageSeo } from "~/hooks/usePageSeo"

const SearchBar = lazy(() => import("~/components/common/search-bar").then(module => ({ default: module.SearchBar })))

function DeferredSearch() {
  const { opened, toggle } = useSearchBar()
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    if (opened) setLoaded(true)
  }, [opened])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggle()
      }
    }
    document.addEventListener("keydown", keydown)
    return () => document.removeEventListener("keydown", keydown)
  }, [toggle])
  return loaded || opened ? <Suspense fallback={null}><SearchBar /></Suspense> : null
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function NotFoundComponent() {
  const { t } = useLocale()
  usePageSeo("notFound")
  return (
    <section className="page-intro">
      <h1>{t("Page not found")}</h1>
      <p>{t("This page is unavailable. Browse NewsNow's news and recommendation sources or return to the home page.")}</p>
      <Link to="/">{t("Back to home")}</Link>
    </section>
  )
}

function RootComponent() {
  const { t } = useLocale()
  useOnReload()
  useSync()
  usePWA()
  return (
    <>
      <a className="skip-link" href="#main-content">{t("Skip to content")}</a>
      <GlobalOverlayScrollbar
        className={$([
          !isMobile && "px-4",
          "app-scroll h-full overflow-x-hidden",
          "md:(px-10)",
          "lg:(px-24)",
        ])}
      >
        <header
          className={$([
            "site-header masthead grid items-center py-4 px-2 sm:px-5",
            "lg:(py-6)",
            "sticky top-0 z-10 backdrop-blur-md",
          ])}
          style={{
            gridTemplateColumns: "auto minmax(0, 1fr) auto",
            direction: "ltr",
          }}
        >
          <Header />
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className={$([
            "mt-2",
            "min-h-[calc(100vh-180px)]",
            "md:(min-h-[calc(100vh-175px)])",
            "lg:(min-h-[calc(100vh-194px)])",
          ])}
        >
          <Outlet />
        </main>
        <footer className="py-6 flex flex-col items-center justify-center text-sm text-neutral-500 font-mono">
          <Footer />
        </footer>
      </GlobalOverlayScrollbar>
      <Toast />
      <DeferredSearch />
      {import.meta.env.DEV && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </>
  )
}
