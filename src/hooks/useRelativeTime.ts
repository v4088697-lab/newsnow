import { useMount } from "react-use"
import { useLocale } from "~/i18n"

/**
 * changed every minute
 */
const timerAtom = atom(0)

timerAtom.onMount = (set) => {
  const timer = setInterval(() => {
    set(Date.now())
  }, 60 * 1000)
  return () => clearInterval(timer)
}

function useVisibility() {
  const [visible, setVisible] = useState(true)
  useMount(() => {
    const handleVisibilityChange = () => {
      setVisible(document.visibilityState === "visible")
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  })
  return visible
}

export function useRelativeTime(timestamp: string | number) {
  const { locale } = useLocale()
  const [time, setTime] = useState<string>()
  const timer = useAtomValue(timerAtom)
  const visible = useVisibility()

  useEffect(() => {
    if (visible) {
      setTime(relativeTime(timestamp, locale))
    }
  }, [timestamp, timer, visible, locale])

  return time
}
