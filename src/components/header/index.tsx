import { Link } from "@tanstack/react-router"
import { useIsFetching } from "@tanstack/react-query"
import type { SourceID } from "@shared/types"
import { NavBar } from "../navbar"
import { PageActions } from "./page-actions"
import { LanguageSwitcher } from "./language-switcher"
import { useLocale } from "~/i18n"
import { currentSourcesAtom, goToTopAtom } from "~/atoms"

function GoTop() {
  const { t } = useLocale()
  const { ok, fn: goToTop } = useAtomValue(goToTopAtom)
  return (
    <button
      type="button"
      title={t("Go To Top")}
      className={$("items-center justify-center", ok ? "btn flex" : "hidden")}
      onClick={goToTop}
    >
      <span className="i-ph:arrow-fat-up-duotone" aria-hidden="true" />
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
      className="btn flex items-center justify-center"
      onClick={refreshAll}
    >
      <span className={$("i-ph:arrow-counter-clockwise-duotone", isFetching && "animate-spin i-ph:circle-dashed-duotone")} aria-hidden="true" />
    </button>
  )
}

export function Header() {
  return (
    <>
      <div className="flex justify-self-start">
        <Link to="/" aria-label="NewsNow" className="flex gap-2 items-center">
          <div className="h-10 w-10 bg-cover" title="logo" style={{ backgroundImage: "url(/icon.svg)" }} />
          <div className="text-2xl font-brand line-height-none!">
            <p>News</p>
            <p className="mt--1">
              <span className="color-primary-6">N</span>
              <span>ow</span>
            </p>
          </div>
        </Link>
        <a target="_blank" href={`${Homepage}/releases/tag/v${Version}`} className="btn text-sm ml-1 font-mono hidden sm:inline">
          {`v${Version}`}
        </a>
      </div>
      <div className="justify-self-center">
        <div className="hidden lg:(inline-block)">
          <NavBar />
        </div>
      </div>
      <div className="justify-self-end flex gap-1 sm:gap-2 items-center text-xl text-primary-600 dark:text-primary">
        <GoTop />
        <Refresh />
        <LanguageSwitcher />
        <PageActions />
      </div>
    </>
  )
}
