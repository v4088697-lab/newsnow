import type { PropsWithChildren } from "react"
import type { SourceID } from "@shared/types"
import type { BaseEventPayload, ElementDragType } from "@atlaskit/pragmatic-drag-and-drop/dist/types/internal-types"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge"
import { createPortal } from "react-dom"
import { useThrottleFn } from "ahooks"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { useWindowSize } from "react-use"
import { DndContext } from "../common/dnd"
import { useSortable } from "../common/dnd/useSortable"
import { OverlayScrollbar } from "../common/overlay-scrollbar"
import type { ItemsProps } from "./card"
import { CardWrapper } from "./card"
import { useLocale } from "~/i18n"
import { currentColumnIDAtom, currentSourcesAtom } from "~/atoms"

const AnimationDuration = 200
const WIDTH = 350
export function Dnd() {
  const { t } = useLocale()
  const [items, setItems] = useAtom(currentSourcesAtom)
  const currentColumnID = useAtomValue(currentColumnIDAtom)
  const sortable = currentColumnID === "focus"
  const [parent] = useAutoAnimate({ duration: AnimationDuration })
  useEntireQuery(items.slice(0, 4))
  const { width } = useWindowSize()
  const isMobile = width < 768
  const minWidth = useMemo(() => {
    // double padding = 32
    return Math.min(width - 32, WIDTH)
  }, [width])

  if (!items.length) return null

  return (
    <DndWrapper items={items} setItems={setItems} isSingleColumn={isMobile} sortable={sortable}>
      <OverlayScrollbar defer className="overflow-x-auto">
        <ol
          className={isMobile
            ? "flex px-2 gap-6 pb-4 scroll-smooth"
            : "grid w-full gap-6"}
          ref={parent}
          style={isMobile
            ? {
                // 横向滚动布局
              }
            : {
                gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
              }}

        >
          {items.map((id, index) => (
            <li
              key={id}
              className={$(isMobile && "flex-shrink-0", isMobile && index === items.length - 1 && "mr-2")}
              style={isMobile ? { width: `min(${WIDTH}px, calc(100vw - 3rem))` } : undefined}

            >
              <SortableCardWrapper id={id} sortable={sortable} immediate={index < 2} />
            </li>
          ))}
        </ol>
      </OverlayScrollbar>
      {isMobile && (
        <div className="flex justify-center">
          <span className="text-sm text-gray-500 text-center">{t("Swipe left or right to see more")}</span>
        </div>
      )}
    </DndWrapper>
  )
}

function DndWrapper({ items, setItems, isSingleColumn, sortable, children }: PropsWithChildren<{
  items: SourceID[]
  setItems: (items: SourceID[]) => void
  isSingleColumn: boolean
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
      axis: isSingleColumn ? "horizontal" : "vertical",
    })
    setItems(update)
  }, [items, setItems, isSingleColumn])
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
