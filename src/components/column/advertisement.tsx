import { useSyncExternalStore } from "react"
import { useLocale } from "~/i18n"

const BREAKPOINTS = ["(min-width: 640px)", "(min-width: 1200px)"]
const SPONSOR_URL = "https://kailashenergy.com/vullnetdemiri"
const PROMOTIONS = {
  first: {
    src: "/assets/promotions/kailash-bracelet-960.d76e60343a70.webp",
    srcSet: "/assets/promotions/kailash-bracelet-480.0c615ffcd9db.webp 480w, /assets/promotions/kailash-bracelet-960.d76e60343a70.webp 960w, /assets/promotions/kailash-bracelet-1920.0f2e71f3bff8.webp 1920w",
    alt: "Amber-colored skull-bead bracelet on a wooden table",
  },
  second: {
    src: "/assets/promotions/kailash-carved-bracelet-960.96da38590965.webp",
    srcSet: "/assets/promotions/kailash-carved-bracelet-480.f1978fd1f756.webp 480w, /assets/promotions/kailash-carved-bracelet-960.96da38590965.webp 960w, /assets/promotions/kailash-carved-bracelet-1920.60abd40268aa.webp 1920w",
    alt: "Carved-bead bracelet with a round pendant on a wooden table",
  },
}

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

export function AdvertisementSlot({ variant = "first" }: { variant?: keyof typeof PROMOTIONS }) {
  const { t } = useLocale()
  const promotion = PROMOTIONS[variant]
  return (
    <li className="sponsored-banner-slot" data-promotion={variant}>
      <aside className="sponsored-banner" aria-label={t("Sponsored feature")}>
        <p className="sponsored-banner-label">{t("Sponsored feature")}</p>
        <a href={SPONSOR_URL} target="_blank" rel="sponsored noopener noreferrer" aria-label={`${t("Sponsored feature")} — Kailash Energy`}>
          <img
            src={promotion.src}
            srcSet={promotion.srcSet}
            sizes="(min-width: 1440px) 1280px, calc(100vw - 32px)"
            width={2172}
            height={724}
            alt={t(promotion.alt)}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        </a>
      </aside>
    </li>
  )
}
