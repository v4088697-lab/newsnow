import type { FixedColumnID } from "@shared/types"
import { localizedPageCopy } from "@shared/seo"
import { Suspense, lazy } from "react"
import { NavBar } from "../navbar"
import { SourceGrid } from "./grid"
import { SourceDirectory } from "./source-directory"
import { currentColumnIDAtom } from "~/atoms"
import { useLocale } from "~/i18n"
import { usePageSeo } from "~/hooks/usePageSeo"

const SortableGrid = lazy(() => import("./dnd").then(module => ({ default: module.Dnd })))

export function Column({ id }: { id: FixedColumnID }) {
  const { locale } = useLocale()
  const [currentColumnID, setCurrentColumnID] = useAtom(currentColumnIDAtom)
  useEffect(() => {
    setCurrentColumnID(id)
  }, [id, setCurrentColumnID])

  const page = usePageSeo(id)
  const copy = localizedPageCopy(page, locale)

  return (
    <>
      <div className="flex justify-center lg:hidden mb-6">
        <NavBar />
      </div>
      <section className="page-intro" aria-labelledby="page-heading">
        <h1 id="page-heading">{copy.heading}</h1>
        <p>{copy.description}</p>
      </section>
      {id === currentColumnID && (id === "focus"
        ? <Suspense fallback={<SourceGrid />}><SortableGrid /></Suspense>
        : <SourceGrid />)}
      <SourceDirectory page={page} />
    </>
  )
}
