import { CardWrapper } from "./card"
import { currentSourcesAtom } from "~/atoms"

// The default columns need no drag monitors or per-card layout observers.
export function SourceGrid() {
  const items = useAtomValue(currentSourcesAtom)
  useEntireQuery(items.slice(0, 4))
  if (!items.length) return null
  return (
    <ol className="source-grid source-grid-deferred">
      {items.map((id, index) => (
        <li key={id}><CardWrapper id={id} immediate={index < 2} /></li>
      ))}
    </ol>
  )
}
