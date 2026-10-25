import { useSyncExternalStore } from "react"
import { useLocale } from "~/i18n"

const BREAKPOINTS = ["(min-width: 640px)", "(min-width: 1200px)"]
const SPONSOR_URL = "https://kailashenergy.com/vullnetdemiri"

function subscribeToGridSize(onChange: () => void) {
  const queries = BREAKPOINTS.map(query => window.matchMedia(query))
  queries.forEach(query => query.addEventListener("change", onChange))
  return () => queries.forEach(query => query.removeEventListener("change", onChange))
}

function gridSize() {
  return window.matchMedia(BREAKPOINTS[1]).matches ? 3 : window.matchMedia(BREAKPOINTS[0]).matches ? 2 : 1
}

// Match the existing CSS grid so the advertisement follows one complete row
// in both DOM order and visual order, without subscribing to every resize.
export function useFirstRowSize() {
  return useSyncExternalStore(subscribeToGridSize, gridSize, () => 1)
}

export function AdvertisementSlot() {
  const { t } = useLocale()
  return (
    <li className="sponsored-banner-slot">
      <aside className="sponsored-banner" aria-label={t("Sponsored feature")}>
        <p className="sponsored-banner-label">{t("Sponsored feature")}</p>
        <a href={SPONSOR_URL} target="_blank" rel="sponsored noopener noreferrer" aria-label={`${t("Sponsored feature")} — Kailash Energy`}>
          <img
            src="/assets/promotions/kailash-bracelet-960.d76e60343a70.webp"
            srcSet="/assets/promotions/kailash-bracelet-480.0c615ffcd9db.webp 480w, /assets/promotions/kailash-bracelet-960.d76e60343a70.webp 960w, /assets/promotions/kailash-bracelet-1920.0f2e71f3bff8.webp 1920w"
            sizes="(min-width: 1440px) 640px, calc(50vw - 16px)"
            width={2172}
            height={724}
            alt={t("Amber-colored skull-bead bracelet on a wooden table")}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        </a>
      </aside>
    </li>
  )
}
