interface ShareLinkProps {
  url?: string
}

export default function ShareLink({ url }: ShareLinkProps) {
  const displayUrl = url || (typeof window !== 'undefined' ? window.location.href : '')

  return (
    <div className="share-url">
      <strong>Shareable link:</strong>
      <a href={displayUrl} className="share-link-url">{displayUrl}</a>
    </div>
  )
}
