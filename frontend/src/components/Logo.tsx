export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="logo">
    <span className="logo-mark" role={compact ? 'img' : undefined} aria-label={compact ? 'MyRSUH' : undefined} aria-hidden={compact ? undefined : true}>
      <img className="logo-mark-light" src="/images/logo-light.png" width={36} height={36} alt="" />
      <img className="logo-mark-dark" src="/images/logo-dark.png" width={36} height={36} alt="" />
    </span>
    {!compact && <span className="logo-name">MyRSUH</span>}
  </div>
}
