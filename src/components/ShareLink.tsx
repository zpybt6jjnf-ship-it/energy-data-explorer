interface ShareLinkProps {
  url?: string
}

export default function ShareLink({ url }: ShareLinkProps) {
  const displayUrl = url || (typeof window !== 'undefined' ? window.location.href : '')

  return (
    <div className="share-url">
      <strong>Shareable link:</strong>
      <code>{displayUrl}</code>
    </div>
  )
}
