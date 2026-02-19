import { useId } from 'react'

interface JerseyIconProps {
  number: number | string | null
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
}

/*
 * High-fidelity basketball jersey silhouette.
 * Uses cubic-bezier curves throughout for smooth, rounded edges.
 * The shape is a sleeveless tank-top with:
 *   - Rounded shoulder straps
 *   - Deep curved armholes
 *   - Smooth U-shaped neckline with white trim
 *   - Slightly flared body
 */
export default function JerseyIcon({
  number,
  primaryColor = '#1b2a4a',
  secondaryColor = '#263a5e',
  accentColor = '#ffffff'
}: JerseyIconProps) {
  const uid = useId()
  const gBody = `jb-${uid}`
  const gHighlight = `jh-${uid}`
  const gShadow = `js-${uid}`
  const blurId = `jblur-${uid}`

  // ---- Path data (all smooth curves) ----

  // Main body silhouette: starts at left shoulder, goes around clockwise
  // Shoulder straps -> neckline -> right shoulder -> right armhole -> body -> hem -> left body -> left armhole
  const bodyPath = [
    // Start at top of left shoulder strap
    'M 52,38',
    // Left strap outer edge curves down to armhole
    'C 42,42 30,52 24,68',
    // Deep armhole curve (smooth scoop)
    'C 18,84 22,98 38,102',
    // Transition to left side of body
    'C 40,103 42,104 42,106',
    // Left body side curves down, slight flare at hem
    'C 40,140 38,170 36,198',
    // Hem bottom-left corner (rounded)
    'C 36,202 38,206 42,206',
    // Bottom hem across
    'L 158,206',
    // Hem bottom-right corner (rounded)
    'C 162,206 164,202 164,198',
    // Right body side curves up
    'C 162,170 160,140 158,106',
    // Transition to right armhole
    'C 158,104 160,103 162,102',
    // Right armhole curve (smooth scoop)
    'C 178,98 182,84 176,68',
    // Right strap outer edge curves up to shoulder
    'C 170,52 158,42 148,38',
    // Right shoulder top to collar
    'C 142,36 132,34 126,34',
    // Right side of collar, curve down to neckline center
    'C 118,34 112,38 100,50',
    // Left side of collar, curve up from neckline center
    'C 88,38 82,34 74,34',
    // Left collar to left shoulder
    'C 68,34 58,36 52,38',
    'Z'
  ].join(' ')

  // Inner neckline opening (U-shape, slightly smaller)
  const necklinePath = [
    'M 74,36',
    'C 82,36 88,40 100,52',
    'C 112,40 118,36 126,36',
  ].join(' ')

  // Left armhole inner edge for trim
  const leftArmholeTrim = [
    'M 52,40',
    'C 42,44 30,54 24,70',
    'C 19,84 22,96 36,100',
  ].join(' ')

  // Right armhole inner edge for trim
  const rightArmholeTrim = [
    'M 148,40',
    'C 158,44 170,54 176,70',
    'C 181,84 178,96 164,100',
  ].join(' ')

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
        viewBox="0 0 200 230"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter id={blurId}>
            <feGaussianBlur stdDeviation="4" />
          </filter>

          {/* Top-to-bottom body gradient */}
          <linearGradient id={gBody} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={secondaryColor} />
            <stop offset="35%" stopColor={primaryColor} />
            <stop offset="100%" stopColor="#0c1525" />
          </linearGradient>

          {/* Left-side highlight for 3D depth */}
          <linearGradient id={gHighlight} x1="0" y1="0" x2="1" y2="0.5">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Right-side shadow for 3D depth */}
          <linearGradient id={gShadow} x1="1" y1="0" x2="0" y2="0.5">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.20" />
            <stop offset="50%" stopColor="#000000" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Drop shadow */}
        <path d={bodyPath} fill="#000" opacity="0.3" transform="translate(2,5)" filter={`url(#${blurId})`} />

        {/* Main jersey body fill */}
        <path d={bodyPath} fill={`url(#${gBody})`} />

        {/* Left highlight overlay */}
        <path d={bodyPath} fill={`url(#${gHighlight})`} />

        {/* Right shadow overlay */}
        <path d={bodyPath} fill={`url(#${gShadow})`} />

        {/* Neckline white trim - outer */}
        <path
          d={necklinePath}
          fill="none"
          stroke={accentColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        {/* Neckline white trim - inner (thinner, more subtle) */}
        <path
          d="M 77,38 C 84,38 90,42 100,52 C 110,42 116,38 123,38"
          fill="none"
          stroke={accentColor}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.3"
        />

        {/* Left shoulder strap top trim */}
        <path
          d="M 52,38 C 58,36 68,34 74,34"
          fill="none"
          stroke={accentColor}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Right shoulder strap top trim */}
        <path
          d="M 148,38 C 142,36 132,34 126,34"
          fill="none"
          stroke={accentColor}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Left armhole trim */}
        <path
          d={leftArmholeTrim}
          fill="none"
          stroke={accentColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
        {/* Right armhole trim */}
        <path
          d={rightArmholeTrim}
          fill="none"
          stroke={accentColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />

        {/* Subtle hem highlight */}
        <path
          d="M 42,204 L 158,204"
          fill="none"
          stroke={accentColor}
          strokeWidth="1.5"
          opacity="0.15"
          strokeLinecap="round"
        />
      </svg>

      {number != null && (
        <span className="jersey-icon-number">{number}</span>
      )}
    </div>
  )
}

