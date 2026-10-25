import { Fragment } from "react"
import { CardWrapper } from "./card"
import { AdvertisementSlot, useFirstRowSize } from "./advertisement"
import { currentSourcesAtom } from "~/atoms"

// The default columns need no drag monitors or per-card layout observers.
export function SourceGrid() {
  const items = useAtomValue(currentSourcesAtom)
  const firstRowSize = useFirstRowSize()
  useEntireQuery(items.slice(0, 4))
  if (!items.length) return null
  return (
    <ol className="source-grid source-grid-deferred">
      {items.map((id, index) => (
        <Fragment key={id}>
          <li><CardWrapper id={id} immediate={index < 2} /></li>
          {index === Math.min(firstRowSize, items.length) - 1 && <AdvertisementSlot />}
        </Fragment>
      ))}
    </ol>
  )
}
