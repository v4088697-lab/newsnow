import { Command } from "cmdk"
import { useMount } from "react-use"
import type { SourceID } from "@shared/types"
import { useMemo, useRef, useState } from "react"
import pinyin from "@shared/pinyin.json"
import { OverlayScrollbar } from "../overlay-scrollbar"
import { useLocale } from "~/i18n"
import { CardWrapper } from "~/components/column/card"

import "./cmdk.css"

interface SourceItemProps {
  id: SourceID
  name: string
  title?: string
  originalTitle?: string
  columnLabel: string
  column: any
  pinyin: string
}

function groupByColumn(items: SourceItemProps[]) {
  return items.reduce((acc, item) => {
    const k = acc.find(i => i.column === item.column)
    if (k) k.sources = [...k.sources, item]
    else acc.push({ column: item.column, sources: [item] })
    return acc
  }, [] as {
    column: string
    sources: SourceItemProps[]
  }[]).sort((m, n) => {
    if (m.column === "tech") return -1
    if (n.column === "tech") return 1

    if (m.column === "uncategorized") return 1
    if (n.column === "uncategorized") return -1

    return m.column < n.column ? -1 : 1
  })
}

export function SearchBar() {
  const { t } = useLocale()
  const { opened, toggle } = useSearchBar()
  const sourceItems = useMemo(
    () =>
      groupByColumn(typeSafeObjectEntries(sources)
        .filter(([_, source]) => !source.redirect)
        .map(([k, source]) => ({
          id: k,
          title: source.title ? t(source.title) : undefined,
          originalTitle: source.title,
          column: source.column ?? "uncategorized",
          columnLabel: source.column ? t(metadata[source.column].name) : t("Uncategorized"),
          name: source.name,
          pinyin: pinyin?.[k as keyof typeof pinyin] ?? "",
        })))
    , [t],
  )
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [value, setValue] = useState<SourceID>("github-trending-today")

  useMount(() => {
    inputRef?.current?.focus()
  })

  return (
    <Command.Dialog
      label={t("Search sources")}
      open={opened}
      onOpenChange={toggle}
      value={value}
      onValueChange={(v) => {
        if (v in sources) {
          setValue(v as SourceID)
        }
      }}
    >
      <Command.Input
        ref={inputRef}
        autoFocus
        placeholder={t("Search sources")}
      />
      <div className="md:flex pt-2">
        <OverlayScrollbar defer className="overflow-y-auto md:min-w-275px">
          <Command.List label={t("Search sources")}>
            <Command.Empty>{t("No sources found. You can request one on GitHub.")}</Command.Empty>
            {
              sourceItems.map(({ column, sources }) => (
                <Command.Group heading={t(column in metadata ? metadata[column as keyof typeof metadata].name : "Uncategorized")} key={column}>
                  {
                    sources.map(item => <SourceItem item={item} key={item.id} />)
                  }
                </Command.Group>
              ),
              )
            }
          </Command.List>
        </OverlayScrollbar>
        <div className="flex-1 pt-2 px-4 min-w-350px max-md:hidden">
          <CardWrapper id={value} />
        </div>
      </div>
    </Command.Dialog>
  )
}

function SourceItem({ item }: {
  item: SourceItemProps
}) {
  const { isFocused, toggleFocus } = useFocusWith(item.id)
  return (
    <Command.Item
      keywords={[item.name, item.title ?? "", item.originalTitle ?? "", item.columnLabel, item.pinyin]}
      value={item.id}
      className="flex justify-between items-center p-2"
      onSelect={toggleFocus}
    >
      <span className="flex gap-2 items-center">
        <span
          className={$("w-4 h-4 rounded-md bg-cover")}
          style={{
            backgroundImage: `url(/icons/${item.id.split("-")[0]}.png)`,
          }}
        />
        <span>{item.name}</span>
        <span className="text-xs text-neutral-400/80 self-end mb-3px">{item.title}</span>
      </span>
      <span className={$(isFocused ? "i-ph-star-fill" : "i-ph-star-duotone", "bg-primary op-40")}></span>
    </Command.Item>
  )
}
