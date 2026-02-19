import { useId } from 'react'

interface JerseyIconProps {
  number: number | string | null
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
}

export default function JerseyIcon({
  number,
  primaryColor = '#0ea5e9',
  secondaryColor = '#22d3ee',
  accentColor = '#0f172a'
}: JerseyIconProps) {
  const id = useId()
  const bodyId = `jersey-body-${id}`
  const highlightId = `jersey-highlight-${id}`
  const collarId = `jersey-collar-${id}`

  return (
    <div
      className="jersey-icon-container"
      style={{
        ['--jersey-primary' as any]: primaryColor,
        ['--jersey-secondary' as any]: secondaryColor,
        ['--jersey-accent' as any]: accentColor
      }}
    >
      <svg
        className="jersey-icon-svg"
        viewBox="0 0 120 120"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--jersey-secondary)" />
            <stop offset="65%" stopColor="var(--jersey-primary)" />
            <stop offset="100%" stopColor="#0b1220" />
          </linearGradient>
          <linearGradient id={collarId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--jersey-accent)" />
            <stop offset="100%" stopColor="var(--jersey-secondary)" />
          </linearGradient>
          <linearGradient id={highlightId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="jersey-shadow"
          d="M28 18l12 10h40l12-10 16 8-6 22-14-6v56H32V42l-14 6-6-22 16-8z"
        />
        <path
          className="jersey-body"
          fill={`url(#${bodyId})`}
          d="M30 20l12 10h36l12-10 14 7-5 18-13-6v58H36V39l-13 6-5-18 12-7z"
        />
        <path
          className="jersey-outline"
          d="M30 20l12 10h36l12-10 14 7-5 18-13-6v58H36V39l-13 6-5-18 12-7z"
        />
        <path
          className="jersey-side-panel"
          d="M30 20l12 10h10l-4 6v61H36V39l-13 6-5-18 12-7z"
        />
        <path
          className="jersey-side-panel jersey-side-panel-right"
          d="M30 20l12 10h10l-4 6v61H36V39l-13 6-5-18 12-7z"
          transform="translate(120 0) scale(-1 1)"
        />
        <path
          className="jersey-collar-base"
          fill={`url(#${collarId})`}
          d="M46 30l6 8h16l6-8-10-6H56l-10 6z"
        />
        <path
          className="jersey-collar-trim"
          d="M46 30l6 8h16l6-8-10-6H56l-10 6z"
        />
        <path className="jersey-shoulder-trim" d="M36 32l-10 7" />
        <path className="jersey-shoulder-trim" d="M84 32l10 7" />
        <path className="jersey-chest-stripe" d="M38 46h44v5H38z" />
        <path className="jersey-chest-stripe-alt" d="M40 54h40v3H40z" />
        <path
          className="jersey-highlight"
          fill={`url(#${highlightId})`}
          d="M30 20l12 10h10l-4 6v61H36V39l-13 6-5-18 12-7z"
        />
        <path className="jersey-trim" d="M38 66h44v4H38z" />
        <circle className="jersey-dot" cx="48" cy="62" r="2.2" />
        <circle className="jersey-dot" cx="72" cy="62" r="2.2" />
      </svg>
      {number != null && (
        <div className="jersey-icon-number">{number}</div>
      )}
    </div>
  )
}

