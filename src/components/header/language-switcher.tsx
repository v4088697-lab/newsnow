import { useEffect, useRef, useState } from "react"
import { languages } from "@shared/i18n"
import { useLocale } from "~/i18n"

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLSpanElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const current = languages.find(item => item.code === locale)!
  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLButtonElement>("[aria-checked=true]")?.focus()
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", outside)
    return () => document.removeEventListener("pointerdown", outside)
  }, [open])
  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  return (
    <span ref={root} className="masthead-language-root relative inline-flex" dir="ltr">
      <button ref={trigger} type="button" title={t("Language")} aria-label={`${t("Language")}: ${current.label}`} aria-haspopup="menu" aria-expanded={open} aria-controls="language-menu" onClick={() => setOpen(!open)} className="masthead-control masthead-language btn inline-flex items-center gap-1 px-2 text-sm">
        <span className="i-ph:translate text-lg" aria-hidden="true" />
        <span>{current.short}</span>
      </button>
      {open && (
        <div
          ref={menu}
          id="language-menu"
          role="menu"
          aria-label={t("Language")}
          className="absolute right-0 top-full mt-3 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-neutral-400/30 bg-base color-base shadow-xl p-2 grid grid-cols-2 gap-1 text-sm"
          onKeyDown={(event) => {
            const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]") ?? [])]
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
            const delta = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0
            if (delta || event.key === "Home" || event.key === "End") {
              event.preventDefault()
              buttons[event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + delta + buttons.length) % buttons.length]?.focus()
            } else if (event.key === "Escape") {
              event.preventDefault()
              close()
            } else if (event.key === "Tab") {
              setOpen(false)
            }
          }}
        >
          {languages.map(language => (
            <button
              key={language.code}
              type="button"
              role="menuitemradio"
              aria-checked={locale === language.code}
              lang={language.code}
              dir={language.code === "ar" ? "rtl" : "ltr"}
              onClick={() => {
                setLocale(language.code)
                close()
              }}
              className={$("rounded-lg px-3 py-2 text-start flex items-center justify-between gap-2 hover:bg-neutral-400/15 focus-visible:outline-primary", locale === language.code && "bg-primary/15 text-primary")}
            >
              <span>{language.label}</span>
              <span className={locale === language.code ? "i-ph:check-bold" : "w-4"} aria-hidden="true" />
            </button>
          ))}
          <p className="col-span-2 px-2 pt-2 pb-1 text-xs op-60 leading-relaxed" dir={locale === "ar" ? "rtl" : "ltr"}>{t("Original headlines are preserved.")}</p>
        </div>
      )}
    </span>
  )
}
