import { useId } from 'react'

interface JerseyIconProps {
  number: number | string | null
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
}

export default function JerseyIcon({
  number,
  primaryColor = '#1a2744',
  secondaryColor = '#243556',
  accentColor = '#ffffff'
}: JerseyIconProps) {
  const id = useId()
  const bodyGradId = `jersey-body-grad-${id}`
  const shadowGradId = `jersey-shadow-grad-${id}`
  const highlightGradId = `jersey-highlight-grad-${id}`
  const foldGradId = `jersey-fold-grad-${id}`

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
        viewBox="0 0 200 220"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {/* Main body gradient - top to bottom darkening */}
          <linearGradient id={bodyGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--jersey-secondary)" />
            <stop offset="40%" stopColor="var(--jersey-primary)" />
            <stop offset="100%" stopColor="#0d1a2e" />
          </linearGradient>
          {/* Drop shadow gradient */}
          <linearGradient id={shadowGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
          </linearGradient>
          {/* Left side highlight for 3D depth */}
          <linearGradient id={highlightGradId} x1="0" y1="0" x2="1" y2="0.3">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          {/* Fabric fold shadow on sides */}
          <linearGradient id={foldGradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Soft drop shadow behind jersey */}
        <path
          d="M44 32 L20 48 L14 82 L30 76 L30 200 L170 200 L170 76 L186 82 L180 48 L156 32 L130 40 L70 40 Z"
          fill="#000000"
          opacity="0.35"
          transform="translate(2, 4)"
          filter="url(#blur)"
        />

        {/* Main jersey body */}
        <path
          className="jersey-body"
          fill={`url(#${bodyGradId})`}
          d="M44 32 L20 48 L14 82 L30 76 L30 200 L170 200 L170 76 L186 82 L180 48 L156 32 L130 40 L70 40 Z"
        />

        {/* Fabric fold darkening on sides */}
        <path
          fill={`url(#${foldGradId})`}
          d="M30 76 L30 200 L170 200 L170 76 Z"
          opacity="0.4"
        />

        {/* Subtle left highlight for dimensionality */}
        <path
          fill={`url(#${highlightGradId})`}
          d="M44 32 L20 48 L14 82 L30 76 L30 200 L100 200 L100 40 L70 40 Z"
        />

        {/* Left armhole curve / sleeve opening */}
        <path
          className="jersey-armhole"
          d="M44 32 L20 48 L14 82 L30 76"
          fill="none"
          stroke="var(--jersey-accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          opacity="0.5"
        />

        {/* Right armhole curve */}
        <path
          className="jersey-armhole"
          d="M156 32 L180 48 L186 82 L170 76"
          fill="none"
          stroke="var(--jersey-accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          opacity="0.5"
        />

        {/* Collar V-neck shape */}
        <path
          className="jersey-collar"
          d="M70 40 L88 30 L100 52 L112 30 L130 40"
          fill="var(--jersey-primary)"
          stroke="none"
        />
        {/* Collar inner darker fill */}
        <path
          d="M70 40 L88 30 L100 52 L112 30 L130 40"
          fill="#0a1628"
          opacity="0.6"
        />

        {/* White collar trim - outer */}
        <path
          d="M68 41 L88 28 L100 52 L112 28 L132 41"
          fill="none"
          stroke="var(--jersey-accent)"
          strokeWidth="3.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.95"
        />
        {/* White collar trim - inner line */}
        <path
          d="M72 40 L89 31 L100 49 L111 31 L128 40"
          fill="none"
          stroke="var(--jersey-accent)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.35"
        />

        {/* Left shoulder strap trim */}
        <path
          d="M44 32 L70 40"
          fill="none"
          stroke="var(--jersey-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Right shoulder strap trim */}
        <path
          d="M156 32 L130 40"
          fill="none"
          stroke="var(--jersey-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Left armhole white trim */}
        <path
          d="M44 33 L21 49 L15 80"
          fill="none"
          stroke="var(--jersey-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
        {/* Right armhole white trim */}
        <path
          d="M156 33 L179 49 L185 80"
          fill="none"
          stroke="var(--jersey-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />

        {/* Bottom hem line */}
        <line
          x1="30" y1="198" x2="170" y2="198"
          stroke="var(--jersey-accent)"
          strokeWidth="2"
          opacity="0.25"
        />

        {/* Subtle vertical center seam */}
        <line
          x1="100" y1="52" x2="100" y2="200"
          stroke="#ffffff"
          strokeWidth="0.5"
          opacity="0.06"
        />
      </svg>
      {number != null && (
        <div className="jersey-icon-number">{number}</div>
      )}
    </div>
  )
}

