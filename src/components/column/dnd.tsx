import type { PropsWithChildren } from "react"
import { Fragment } from "react"
import type { SourceID } from "@shared/types"
import type { BaseEventPayload, ElementDragType } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge"
import { createPortal } from "react-dom"
import { useThrottleFn } from "ahooks"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { DndContext } from "../common/dnd"
import { useSortable } from "../common/dnd/useSortable"
import type { ItemsProps } from "./card"
import { CardWrapper } from "./card"
import { AdvertisementSlot, useFirstRowSize } from "./advertisement"
import { useLocale } from "~/i18n"
import { currentColumnIDAtom, currentSourcesAtom } from "~/atoms"

const AnimationDuration = 200
export function Dnd() {
  const [items, setItems] = useAtom(currentSourcesAtom)
  const firstRowSize = useFirstRowSize()
  const currentColumnID = useAtomValue(currentColumnIDAtom)
  const sortable = currentColumnID === "focus"
  const [parent] = useAutoAnimate({ duration: AnimationDuration })
  useEntireQuery(items.slice(0, 4))

  if (!items.length) return null

  return (
    <DndWrapper items={items} setItems={setItems} sortable={sortable}>
      <ol className="source-grid" ref={parent}>
        {items.map((id, index) => (
          <Fragment key={id}>
            <li><SortableCardWrapper id={id} sortable={sortable} immediate={index < 2} /></li>
            {index === Math.min(firstRowSize, items.length) - 1 && <AdvertisementSlot />}
            {items.length > firstRowSize && index === Math.min(firstRowSize * 2, items.length) - 1 && <AdvertisementSlot variant="second" />}
            {items.length > firstRowSize * 2 && index === Math.min(firstRowSize * 3, items.length) - 1 && <AdvertisementSlot variant="third" />}
            {items.length > firstRowSize * 3 && index === Math.min(firstRowSize * 4, items.length) - 1 && <AdvertisementSlot variant="fourth" />}
          </Fragment>
        ))}
      </ol>
    </DndWrapper>
  )
}

function DndWrapper({ items, setItems, sortable, children }: PropsWithChildren<{
  items: SourceID[]
  setItems: (items: SourceID[]) => void
  sortable: boolean
}>) {
  const onDropTargetChange = useCallback(({ location, source }: BaseEventPayload<ElementDragType>) => {
    const traget = location.current.dropTargets[0]
    if (!traget?.data || !source?.data) return
    const closestEdgeOfTarget = extractClosestEdge(traget.data)
    const fromIndex = items.indexOf(source.data.id as SourceID)
    const toIndex = items.indexOf(traget.data.id as SourceID)
    if (fromIndex === toIndex || fromIndex === -1 || toIndex === -1) return
    const update = reorderWithEdge({
      list: items,
      startIndex: fromIndex,
      indexOfTarget: toIndex,
      closestEdgeOfTarget,
      axis: "vertical",
    })
    setItems(update)
  }, [items, setItems])
  // 避免动画干扰
  const { run } = useThrottleFn(onDropTargetChange, {
    leading: true,
    trailing: true,
    wait: AnimationDuration,
  })
  const { el } = useAtomValue(goToTopAtom)
  if (!sortable) return children

  return (
    <DndContext onDropTargetChange={run} autoscroll={el ? { element: el } : undefined}>
      {children}
    </DndContext>
  )
}

function CardOverlay({ id }: { id: SourceID }) {
  const { t } = useLocale()
  return (
    <div className={$(
      "flex flex-col p-4 backdrop-blur-5",
      `bg-${sources[id].color}-500 dark:bg-${sources[id].color} bg-op-40!`,
      !isiOS() && "rounded-2xl",
    )}
    >
      <div className={$("flex justify-between mx-2 items-center")}>
        <div className="flex gap-2 items-center min-w-0 flex-1">
          <div
            className={$("w-8 h-8 rounded-full bg-cover shrink-0")}
            style={{
              backgroundImage: `url(/icons/${id.split("-")[0]}.png)`,
            }}
          />
          <span className="flex flex-col min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xl font-bold break-words leading-tight">
                <bdi>{sources[id].name}</bdi>
              </span>
              {sources[id]?.title && <span className={$("text-sm", `color-${sources[id].color} bg-base op-80 bg-op-50! px-1 rounded`)}>{t(sources[id].title!)}</span>}
            </span>
            <span className="text-xs op-70">{t("Dragging")}</span>
          </span>
        </div>
        <div className={$("flex gap-2 text-lg shrink-0 ml-2", `color-${sources[id].color}`)}>
          <button
            type="button"
            className={$("i-ph:dots-six-vertical-duotone", "cursor-grabbing")}
          />
        </div>
      </div>
    </div>
  )
}

function SortableCardWrapper({ id, sortable, immediate }: ItemsProps & { sortable: boolean }) {
  const {
    isDragging,
    setNodeRef,
    setHandleRef,
    OverlayContainer,
  } = useSortable({ id })

  useEffect(() => {
    if (OverlayContainer) {
      OverlayContainer!.className += $(`bg-base`, !isiOS() && "rounded-2xl")
    }
  }, [OverlayContainer])

  return (
    <>
      <CardWrapper
        ref={setNodeRef}
        id={id}
        immediate={immediate}
        isDragging={isDragging}
        setHandleRef={sortable ? setHandleRef : undefined}
      />
      {OverlayContainer && createPortal(<CardOverlay id={id} />, OverlayContainer)}
    </>
  )
}
