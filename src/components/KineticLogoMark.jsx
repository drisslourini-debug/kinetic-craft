import React, { useId } from 'react'

/**
 * Kinetic Craft Bildmarke — «Titanium Wing» (Apple Pro Titanium Edition 2026).
 * Gebürstetes Dark-Titanium-Squircle mit vertikaler Starlight-Säule und
 * fliessendem Natural-Titanium-Flügel.
 */
export default function KineticLogoMark({
  className = 'w-10 h-10',
  accent = '#D6BA94',
  title = 'Kinetic Craft',
}) {
  const uid = useId().replace(/:/g, '')
  const bgGradId = `kc-ti-bg-${uid}`
  const wingGradId = `kc-ti-wing-${uid}`

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={bgGradId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2C2C32" />
          <stop offset="1" stopColor="#0B0B0E" />
        </linearGradient>
        <linearGradient id={wingGradId} x1="24" y1="14" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF3E0" />
          <stop offset="0.5" stopColor={accent} />
          <stop offset="1" stopColor="#9E825C" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="16"
        fill={`url(#${bgGradId})`}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1.5"
      />
      <rect x="19" y="15" width="6.5" height="34" rx="3.25" fill="#F5F5F7" />
      <path
        d="M43 16.5C44.4 15.2 46.6 15.2 47.9 16.5C49.2 17.8 49.2 20 47.9 21.3L35.2 32L47.9 42.7C49.2 44 49.2 46.2 47.9 47.5C46.6 48.8 44.4 48.8 43 47.5L28.2 34.6C26.5 33.1 26.5 30.9 28.2 29.4L43 16.5Z"
        fill={`url(#${wingGradId})`}
      />
    </svg>
  )
}
