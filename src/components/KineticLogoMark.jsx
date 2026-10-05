/**
 * Kinetic Craft Bildmarke (Doppel-Raute mit K).
 * Die Hauptform folgt `currentColor` (Anthrazit auf hell, Weiss auf dunkel),
 * der Bewegungs-Akzent bleibt Gold.
 */
export default function KineticLogoMark({ className = 'w-10 h-10', accent = '#c5a057', title = 'Kinetic Craft' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" role="img" aria-label={title}>
      <title>{title}</title>
      <path d="M36 4 L56 32 L36 60" stroke={accent} strokeWidth="3.5" strokeLinejoin="miter" />
      <path d="M26 4 L46 32 L26 60 L6 32 Z" stroke="currentColor" strokeWidth="5" strokeLinejoin="miter" />
      <path
        d="M21.5 21 V43 M23.5 32.5 L32.5 22.5 M27.5 30 L33 41.5"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinejoin="miter"
      />
    </svg>
  )
}
