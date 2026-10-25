import { useLocale } from "~/i18n"

/**
 * changed every minute
 */
const timerAtom = atom(0)

timerAtom.onMount = (set) => {
  const update = () => {
    if (document.visibilityState === "visible") set(Date.now())
  }
  const timer = setInterval(() => {
    update()
  }, 60 * 1000)
  document.addEventListener("visibilitychange", update)
  return () => {
    clearInterval(timer)
    document.removeEventListener("visibilitychange", update)
  }
}

export function useRelativeTime(timestamp: string | number) {
  const { locale } = useLocale()
  const timer = useAtomValue(timerAtom)
  return useMemo(() => relativeTime(timestamp, locale), [timestamp, timer, locale])
}
