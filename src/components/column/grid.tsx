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
          {items.length > firstRowSize && index === Math.min(firstRowSize * 2, items.length) - 1 && <AdvertisementSlot variant="second" />}
          {items.length > firstRowSize * 2 && index === Math.min(firstRowSize * 3, items.length) - 1 && <AdvertisementSlot variant="third" />}
          {items.length > firstRowSize * 3 && index === Math.min(firstRowSize * 4, items.length) - 1 && <AdvertisementSlot variant="fourth" />}
          {items.length > firstRowSize * 4 && index === Math.min(firstRowSize * 5, items.length) - 1 && <AdvertisementSlot variant="fifth" />}
          {items.length > firstRowSize * 5 && index === Math.min(firstRowSize * 6, items.length) - 1 && <AdvertisementSlot variant="sixth" />}
        </Fragment>
      ))}
    </ol>
  )
}
