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
  third: {
    src: "/assets/promotions/kailash-multicolor-bracelet-960.e7a6df546f52.webp",
    srcSet: "/assets/promotions/kailash-multicolor-bracelet-480.175cdb88cea8.webp 480w, /assets/promotions/kailash-multicolor-bracelet-960.e7a6df546f52.webp 960w, /assets/promotions/kailash-multicolor-bracelet-1920.01f9049256b4.webp 1920w",
    alt: "Multicolored bead bracelet with English material labels on a black background",
  },
  fourth: {
    src: "/assets/promotions/kailash-necklace-960.4a4ca374bf54.webp",
    srcSet: "/assets/promotions/kailash-necklace-480.fde1547cd19c.webp 480w, /assets/promotions/kailash-necklace-960.4a4ca374bf54.webp 960w, /assets/promotions/kailash-necklace-1920.4db63ba8c92b.webp 1920w",
    alt: "Carved-bead necklace with pendants and tassels on a red velvet display",
  },
  fifth: {
    src: "/assets/promotions/kailash-dzi-bracelet-960.926fadaf34a6.webp",
    srcSet: "/assets/promotions/kailash-dzi-bracelet-480.6d4927048cb2.webp 480w, /assets/promotions/kailash-dzi-bracelet-960.926fadaf34a6.webp 960w, /assets/promotions/kailash-dzi-bracelet-1920.ff54cc114386.webp 1920w",
    alt: "Dzi-bead bracelet with English material labels on a black background",
  },
  sixth: {
    src: "/assets/promotions/kailash-turquoise-bracelet-960.a4b1920d6d7d.webp",
    srcSet: "/assets/promotions/kailash-turquoise-bracelet-480.33b111bbf656.webp 480w, /assets/promotions/kailash-turquoise-bracelet-960.a4b1920d6d7d.webp 960w, /assets/promotions/kailash-turquoise-bracelet-1920.6311ae20f8cf.webp 1920w",
    alt: "Turquoise and black bead bracelet with a brass charm on an antique wooden box",
  },
  seventh: {
    src: "/assets/promotions/kailash-yellow-bracelet-960.63674bc7b421.webp",
    srcSet: "/assets/promotions/kailash-yellow-bracelet-480.3ca776544a73.webp 480w, /assets/promotions/kailash-yellow-bracelet-960.63674bc7b421.webp 960w, /assets/promotions/kailash-yellow-bracelet-1920.13619949c0b5.webp 1920w",
    alt: "Yellow bead bracelet with turquoise accents and a silver charm beside a painted wooden box",
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
