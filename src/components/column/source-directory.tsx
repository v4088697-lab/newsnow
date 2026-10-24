import { pageSources } from "@shared/seo"
import type { SeoPage } from "@shared/seo"
import { sources } from "@shared/sources"
import { useLocale } from "~/i18n"

export function SourceDirectory({ page }: { page: SeoPage }) {
  const { t } = useLocale()
  const ids = pageSources(page)
  if (!ids.length) return null
  return (
    <section className="source-directory" aria-labelledby="source-directory-heading">
      <details>
        <summary><h2 id="source-directory-heading">{t("Explore sources")}</h2></summary>
        <p>{t("Open original sources. Recommendation scope and fallback content are explained on each card. Some content may require a subscription.")}</p>
        <ul>
          {ids.map(id => (
            <li key={id}>
              <a href={sources[id].home} target="_blank" rel="noopener noreferrer"><bdi>{sources[id].name}</bdi></a>
              {sources[id].title && (
                <span>
                  {" "}
                  —
                  {t(sources[id].title!)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
