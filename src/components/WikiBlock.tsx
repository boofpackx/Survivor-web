import { wikiUrl } from '../lib/fandom'
import { handleWikiLinkClick } from '../lib/wikiLinks'

/** Sanitized wiki HTML whose links stay inside the app, plus the CC-BY-SA credit. */
export default function WikiBlock({ html, page }: { html: string; page: string }) {
  return (
    <div className="wiki-content" onClick={handleWikiLinkClick}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <p className="wiki-credit">
        Content from the{' '}
        <a href={wikiUrl(page)} target="_blank" rel="noopener noreferrer" data-external="">
          Survivor Wiki
        </a>{' '}
        (CC-BY-SA)
      </p>
    </div>
  )
}
