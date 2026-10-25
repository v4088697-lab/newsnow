import { localizeAnnotation, sourceDescription } from "@shared/i18n/content"
import type { NewsItem, SourceID } from "@shared/types"
import { useQuery } from "@tanstack/react-query"
import { useWindowSize } from "react-use"
import { forwardRef, useImperativeHandle, useLayoutEffect } from "react"
import { OverlayScrollbar } from "../common/overlay-scrollbar"
import { useLocale } from "~/i18n"
import { sourceQueryOptions } from "~/utils/source-query"

export interface ItemsProps extends React.HTMLAttributes<HTMLDivElement> {
  id: SourceID
  /**
   * 是否显示透明度，拖动时原卡片的样式
   */
  isDragging?: boolean
  setHandleRef?: (ref: HTMLElement | null) => void
  immediate?: boolean
}

interface NewsCardProps {
  id: SourceID
  active: boolean
  setHandleRef?: (ref: HTMLElement | null) => void
}

export const CardWrapper = forwardRef<HTMLElement, ItemsProps>(({ id, isDragging, setHandleRef, immediate = false, style, ...props }, dndRef) => {
  const ref = useRef<HTMLElement>(null)
  const restoreFocus = useRef(false)

  const [inView, setInView] = useState(immediate)
  useEffect(() => {
    if (inView) return
    if (!("IntersectionObserver" in window)) {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        setInView(true)
        observer.disconnect()
      }
    }, { rootMargin: "200px" })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [inView])

  useImperativeHandle(dndRef, () => ref.current!)
  useLayoutEffect(() => {
    if (inView && restoreFocus.current) {
      restoreFocus.current = false
      ref.current?.querySelector<HTMLAnchorElement>("a")?.focus()
    }
  }, [inView])

  return (
    <article
      ref={ref}
      aria-busy={!inView}
      onFocusCapture={() => {
        if (!inView) restoreFocus.current = true
        setInView(true)
      }}
      className={$(
        "news-card flex flex-col h-500px rounded-2xl p-4 cursor-default",
        // "backdrop-blur-5",
        "transition-opacity-300",
        isDragging && "op-50",
        `bg-${sources[id].color}-500 dark:bg-${sources[id].color} bg-op-40!`,
      )}
      style={{
        transformOrigin: "50% 50%",
        ...style,
      }}
      {...props}
    >
      {inView ? <NewsCard id={id} active setHandleRef={setHandleRef} /> : <CardPreview id={id} />}
    </article>
  )
})

function CardPreview({ id }: { id: SourceID }) {
  const { locale, t } = useLocale()
  const description = sourceDescription(id, sources[id].desc, locale)
  return (
    <>
      <div className="flex items-center gap-2 mx-2 mb-2 min-w-0">
        <a href={sources[id].home} target="_blank" rel="noopener noreferrer" aria-label={`${sources[id].name} — ${t("Open original source")}`} title={description} className="w-8 h-8 rounded-full bg-cover shrink-0" style={{ backgroundImage: `url(/icons/${id.split("-")[0]}.png)` }} />
        <div className="min-w-0">
          <h2 className="text-xl font-bold break-words leading-tight"><bdi>{sources[id].name}</bdi></h2>
          <span className="text-xs op-70">{t("Loading...")}</span>
        </div>
      </div>
      <div className="h-full p-2 min-h-0 rounded-2xl bg-base bg-op-70!" />
    </>
  )
}

function NewsCard({ id, active, setHandleRef }: NewsCardProps) {
  const { locale, t } = useLocale()
  const description = sourceDescription(id, sources[id].desc, locale)
  const { refresh } = useRefetch()
  const { data, isFetching, isError } = useQuery({ ...sourceQueryOptions(id), enabled: active })

  const { isFocused, toggleFocus } = useFocusWith(id)

  return (
    <>
      <div className={$("flex justify-between mx-2 mt-0 mb-2 items-center")}>
        <div className="flex gap-2 items-center min-w-0 flex-1">
          <a
            className={$("w-8 h-8 rounded-full bg-cover shrink-0")}
            target="_blank"
            href={sources[id].home}
            title={description}
            aria-label={`${sources[id].name} — ${t("Open original source")}`}
            rel="noopener noreferrer"
            style={{
              backgroundImage: `url(/icons/${id.split("-")[0]}.png)`,
            }}
          />
          <div className="flex flex-col min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2
                className="text-xl font-bold break-words leading-tight"
                title={description}
              >
                <bdi>{sources[id].name}</bdi>
              </h2>
              {sources[id]?.title && <span className={$("text-sm", `color-${sources[id].color} bg-base op-80 bg-op-50! px-1 rounded`)}>{t(sources[id].title!)}</span>}
            </div>
            <span className="text-xs op-70">
              <UpdatedTime isError={isError} updatedTime={data?.updatedTime} />
              {id === "pinterest" && <bdi>{` · ${t("Pins: {count}/{total}", { count: (data?.items.length ?? 0).toLocaleString(locale), total: (10).toLocaleString(locale) })}`}</bdi>}
              {["quora", "x"].includes(id) && <bdi>{` · ${t("Topics: {count}/{total}", { count: (data?.items.length ?? 0).toLocaleString(locale), total: (10).toLocaleString(locale) })}`}</bdi>}
            </span>
          </div>
        </div>
        <div className={$("flex gap-2 text-lg shrink-0 ms-2", `color-${sources[id].color}`)}>
          <button
            type="button"
            className={$("btn i-ph:arrow-counter-clockwise-duotone", isFetching && "animate-spin i-ph:circle-dashed-duotone")}
            aria-label={t("Refresh source")}
            onClick={() => refresh(id)}
          />
          <button
            type="button"
            className={$("btn", isFocused ? "i-ph:star-fill" : "i-ph:star-duotone")}
            aria-label={t(isFocused ? "Unfollow source" : "Follow source")}
            onClick={toggleFocus}
          />
          {/* firefox cannot drag a button */}
          {setHandleRef && (
            <div
              ref={setHandleRef}
              className={$("btn", "i-ph:dots-six-vertical-duotone", "cursor-grab")}
            />
          )}
        </div>
      </div>

      {active
        ? (
            <OverlayScrollbar
              className={$([
                "h-full p-2 overflow-y-auto rounded-2xl bg-base bg-op-70!",
                isFetching && `animate-pulse`,
                `sprinkle-${sources[id].color}`,
              ])}
              options={{
                overflow: { x: "hidden" },
              }}
              defer
            >
              <div className={$("transition-opacity-500", isFetching && "op-20")}>
                {active && !!data?.items?.length && (["pinterest", "instagram", "facebook"].includes(id) ? <VisualList id={id} items={data.items} /> : sources[id].type === "hottest" ? <NewsListHot items={data.items} description={description} /> : <NewsListTimeLine items={data.items} description={description} />)}
              </div>
            </OverlayScrollbar>
          )
        : <div className="h-full p-2 min-h-0 overflow-y-auto rounded-2xl bg-base bg-op-70!" />}
    </>
  )
}

function VisualList({ id, items }: { id: SourceID, items: NewsItem[] }) {
  const { locale, t } = useLocale()
  return (
    <ol className="flex flex-col gap-3" aria-label={t(id === "instagram" ? "Instagram video and photo picks" : id === "facebook" ? "Facebook video and photo picks" : "Pinterest 7-day image and text picks")}>
      {items.map(item => (
        <li key={item.id}>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-center p-1 rounded-md hover:bg-neutral-400/10 transition-colors">
            {item.extra?.image && (
              <img src={item.extra.image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" width={80} height={80} className="w-20 h-20 shrink-0 object-cover rounded-lg bg-neutral-400/10" onError={event => event.currentTarget.hidden = true} />
            )}
            <span className="flex flex-col gap-1 min-w-0">
              <bdi className="text-base break-words leading-snug">{item.title}</bdi>
              <span className="text-xs text-neutral-400/80">{localizeAnnotation(locale, item.extra?.info)}</span>
            </span>
          </a>
        </li>
      ))}
    </ol>
  )
}

function UpdatedTime({ isError, updatedTime }: { updatedTime: any, isError: boolean }) {
  const { t } = useLocale()
  const relativeTime = useRelativeTime(updatedTime ?? "")
  if (relativeTime) return t("Updated {time}", { time: relativeTime })
  if (isError) return t("Failed to load")
  return t("Loading...")
}

function DiffNumber({ diff }: { diff: number }) {
  const [shown, setShown] = useState(true)
  useEffect(() => {
    setShown(true)
    const timer = setTimeout(() => {
      setShown(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [setShown, diff])

  return (
    <>
      { shown && (
        <span
          className={$("rank-diff absolute left-0 text-xs", diff < 0 ? "text-green" : "text-red")}
        >
          {diff > 0 ? `+${diff}` : diff}
        </span>
      )}
    </>
  )
}
function ExtraInfo({ item }: { item: NewsItem }) {
  const { locale } = useLocale()
  if (item?.extra?.info) {
    return <>{localizeAnnotation(locale, item.extra.info)}</>
  }
  if (item?.extra?.icon) {
    const { url, scale } = typeof item.extra.icon === "string" ? { url: item.extra.icon, scale: undefined } : item.extra.icon
    return (
      <img
        src={url}
        style={{
          transform: `scale(${scale ?? 1})`,
        }}
        className="h-4 inline mt--1"
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={e => e.currentTarget.style.display = "none"}
      />
    )
  }
}

function NewsUpdatedTime({ date }: { date: string | number }) {
  const relativeTime = useRelativeTime(date)
  return <>{relativeTime}</>
}
function NewsListHot({ items, description }: { items: NewsItem[], description?: string }) {
  const { locale } = useLocale()
  const { width } = useWindowSize()
  return (
    <ol className="flex flex-col gap-2">
      {items?.map((item, i) => (
        <li key={item.id}>
          <a
            href={width < 768 ? item.mobileUrl || item.url : item.url}
            target="_blank"
            rel="noopener noreferrer"
            title={locale === "en" ? item.extra?.hover : item.extra?.hover ? `${description ?? ""}\n${localizeAnnotation(locale, item.extra.info) ?? ""}` : undefined}
            className={$(
              "flex gap-2 items-center items-stretch relative cursor-pointer [&_*]:cursor-pointer transition-all",
              "hover:bg-neutral-400/10 rounded-md pr-1 visited:(text-neutral-400)",
            )}
          >
            <span className={$("bg-neutral-400/10 min-w-6 flex justify-center items-center rounded-md text-sm")}>
              {i + 1}
            </span>
            {!!item.extra?.diff && <DiffNumber diff={item.extra.diff} />}
            <span className="self-start line-height-none flex-1 min-w-0">
              <bdi dir="auto" className={$("me-2 text-base", (locale === "ar" || item.extra?.peacock) && "block text-start")}>
                {item.title}
              </bdi>
              <span className={$("text-xs text-neutral-400/80 align-middle", item.extra?.peacock ? "block mt-1 text-start break-words" : locale === "ar" ? "block mt-1 text-start" : "truncate")}>
                <ExtraInfo item={item} />
              </span>
            </span>
          </a>
        </li>
      ))}
    </ol>
  )
}

function NewsListTimeLine({ items, description }: { items: NewsItem[], description?: string }) {
  const { locale } = useLocale()
  const { width } = useWindowSize()
  return (
    <ol className="border-s border-neutral-400/50 flex flex-col ms-1">
      {items?.map(item => (
        <li key={`${item.id}-${item.pubDate || item?.extra?.date || ""}`} className="flex flex-col">
          <span className="flex items-center gap-1 text-neutral-400/50 ms--1px">
            <span className="">-</span>
            <span className="text-xs text-neutral-400/80">
              {(item.pubDate || item?.extra?.date) && <NewsUpdatedTime date={(item.pubDate || item?.extra?.date)!} />}
            </span>
            <span className="text-xs text-neutral-400/80">
              <ExtraInfo item={item} />
            </span>
          </span>
          <a
            dir="auto"
            className={$(
              "ms-2 px-1 hover:bg-neutral-400/10 rounded-md visited:(text-neutral-400/80)",
              "cursor-pointer [&_*]:cursor-pointer transition-all",
            )}
            href={width < 768 ? item.mobileUrl || item.url : item.url}
            title={locale === "en" ? item.extra?.hover : item.extra?.hover ? `${description ?? ""}\n${localizeAnnotation(locale, item.extra.info) ?? ""}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            <bdi>{item.title}</bdi>
          </a>
        </li>
      ))}
    </ol>
  )
}
