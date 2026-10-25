import { Link } from "@tanstack/react-router"
import { useIsFetching } from "@tanstack/react-query"
import type { SourceID } from "@shared/types"
import { NavBar } from "../navbar"
import { PageActions } from "./page-actions"
import { LanguageSwitcher } from "./language-switcher"
import { useLocale } from "~/i18n"
import { currentSourcesAtom, goToTopAtom } from "~/atoms"
import "./masthead.css"

function GoTop() {
  const { t } = useLocale()
  const { ok, fn: goToTop } = useAtomValue(goToTopAtom)
  return (
    <button
      type="button"
      title={t("Go To Top")}
      className={$("masthead-control items-center justify-center", ok ? "btn flex" : "hidden")}
      onClick={goToTop}
    >
      <span className="i-ph:arrow-up" aria-hidden="true" />
    </button>
  )
}

function Refresh() {
  const { t } = useLocale()
  const currentSources = useAtomValue(currentSourcesAtom)
  const { refresh } = useRefetch()
  const refreshAll = useCallback(() => refresh(...currentSources), [refresh, currentSources])

  const isFetching = useIsFetching({
    predicate: (query) => {
      const [type, id] = query.queryKey as ["source" | "entire", SourceID]
      return (type === "source" && currentSources.includes(id)) || type === "entire"
    },
  })

  return (
    <button
      type="button"
      title={t("Refresh all sources")}
      aria-label={t("Refresh all sources")}
      className="masthead-control btn flex items-center justify-center"
      onClick={refreshAll}
    >
      <span className={$("i-ph:arrow-clockwise", isFetching && "animate-spin")} aria-hidden="true" />
    </button>
  )
}

export function Header() {
  const { ok: showGoToTop } = useAtomValue(goToTopAtom)
  return (
    <>
      <div className={$("masthead-brand-group", showGoToTop && "masthead-compact")}>
        <Link to="/" aria-label="NewsNow" className="masthead-brand">
          <img src="/brand-mark.svg" alt="" width={40} height={40} className="masthead-mark" />
          <span className="masthead-wordmark">
            NEWS
            <span>NOW</span>
            <span className="masthead-period">.</span>
          </span>
        </Link>
      </div>
      <div className="masthead-nav justify-self-center">
        <div className="hidden lg:(inline-block)">
          <NavBar />
        </div>
      </div>
      <div className="masthead-actions justify-self-end flex items-center">
        <GoTop />
        <Refresh />
        <LanguageSwitcher />
        <PageActions />
      </div>
    </>
  )
}
