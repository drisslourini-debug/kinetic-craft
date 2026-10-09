import React from 'react'

/**
 * Kinetic Craft - Swiss Brand Icon System
 * Style: Schweizer Duotone & Precision (Slate + Kinetic Amber/Gold)
 * Each icon features precise 1.75px vector lines, soft joins, and warm gold accents.
 */

// 1. Schreinerei & Holzbau (Handsäge & Präzisionswinkel)
export function IconSchreinerei({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Wood accent fill */}
      <path
        d="M6 18L18 6L20 8L8 20L6 18Z"
        fill="#b88a38"
        fillOpacity="0.22"
      />
      {/* Saw Blade */}
      <path
        d="M3 17L7 21M7 21L21 7L17 3L3 17Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Saw Teeth serration */}
      <path
        d="M7 21L9 19L11 21L13 19L15 21L17 19L19 21"
        stroke="#b88a38"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Carpenter Angle / Hole */}
      <circle cx="17.5" cy="6.5" r="1.5" fill="#b88a38" />
    </svg>
  )
}

// 2. Maler & Gipser (Farbroller mit Farbauftrag & Malerpalette)
export function IconMaler({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Paint trail accent */}
      <path
        d="M4 3H16C17.1046 3 18 3.89543 18 5V7C18 8.10457 17.1046 9 16 9H4C2.89543 9 2 8.10457 2 7V5C2 3.89543 2.89543 3 4 3Z"
        fill="#b88a38"
        fillOpacity="0.25"
      />
      {/* Roller Cylinder */}
      <rect
        x="3"
        y="3"
        width="14"
        height="6"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Roller Bracket */}
      <path
        d="M17 6H19C19.5523 6 20 6.44772 20 7V12C20 12.5523 19.5523 13 19 13H12V16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Handle */}
      <rect
        x="10.5"
        y="16"
        width="3"
        height="6"
        rx="1"
        fill="#b88a38"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      {/* Drip accent */}
      <circle cx="6" cy="12" r="1.25" fill="#b88a38" />
    </svg>
  )
}

// 3. Elektro & Gebäudeautomation (Präzisions-Blitz & Schaltungskreis)
export function IconElektro({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Circuit ring accent */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
      {/* Golden Energy Bolt Fill */}
      <path
        d="M13 2L4 13H12L11 22L20 11H12L13 2Z"
        fill="#b88a38"
        fillOpacity="0.2"
      />
      {/* Energy Bolt Stroke */}
      <path
        d="M13 2L4 13H12L11 22L20 11H12L13 2Z"
        stroke="#b88a38"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Terminal Points */}
      <circle cx="13" cy="2" r="1.5" fill="currentColor" />
      <circle cx="11" cy="22" r="1.5" fill="currentColor" />
    </svg>
  )
}

// 4. Sanitär & Heizung (Rohrverbindung, Wassertropfen & Thermostat)
export function IconSanitaer({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Pipe fitting path */}
      <path
        d="M3 6H8V11H13V16H18V21"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pipe flanges */}
      <rect x="2" y="4" width="2" height="4" rx="0.5" fill="currentColor" />
      <rect x="17" y="19" width="4" height="2" rx="0.5" fill="currentColor" />
      {/* Water Droplet / Flame Accent */}
      <path
        d="M16 4C16 4 12 8.5 12 11C12 13.2091 13.7909 15 16 15C18.2091 15 20 13.2091 20 11C20 8.5 16 4 16 4Z"
        fill="#b88a38"
        fillOpacity="0.25"
        stroke="#b88a38"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="11.5" r="1.5" fill="#b88a38" />
    </svg>
  )
}

// 5. Garten- & Landschaftsbau (Präzise Botanik & Vermessung)
export function IconGartenbau({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Soil base */}
      <path d="M3 21H21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      {/* Stem */}
      <path d="M12 21V9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      {/* Left Leaf with Amber Fill */}
      <path
        d="M12 15C8 15 6 12 6 9C9 9 12 11 12 15Z"
        fill="#b88a38"
        fillOpacity="0.25"
        stroke="#b88a38"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right Leaf */}
      <path
        d="M12 12C16 12 18 9 18 6C15 6 12 8 12 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Growth Spark */}
      <circle cx="12" cy="5" r="1.5" fill="#b88a38" />
    </svg>
  )
}

// 6. Bauunternehmung & Renovation (Baukran, Kelle & Mauerwerk)
export function IconBauunternehmung({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Foundation / Bricks Accent */}
      <rect x="4" y="16" width="16" height="5" rx="1" fill="#b88a38" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 16V21" stroke="currentColor" strokeWidth="1.5" />
      {/* Crane Tower */}
      <path d="M7 16V4L19 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {/* Crane Jib Truss */}
      <path d="M7 7L19 4M7 10L14 4" stroke="currentColor" strokeWidth="1.25" opacity="0.6" />
      {/* Hoist Cable & Hook */}
      <path d="M16 4V10M15 10H17" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" />
      {/* Suspended Block */}
      <rect x="14" y="11" width="4" height="3" rx="0.5" fill="#b88a38" stroke="#b88a38" strokeWidth="1.5" />
    </svg>
  )
}

// 7. Allround-Handwerk & Service (Hammer & Werkzeug)
export function IconAllround({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Crossed Wrench & Hammer */}
      <path
        d="M14.7 6.3L17.7 3.3C18.1 2.9 18.7 2.9 19.1 3.3L20.7 4.9C21.1 5.3 21.1 5.9 20.7 6.3L17.7 9.3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M14.7 6.3L4.3 16.7C3.9 17.1 3.9 17.7 4.3 18.1L5.9 19.7C6.3 20.1 6.9 20.1 7.3 19.7L17.7 9.3"
        fill="#b88a38"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M6 6L18 18M9.5 4.5L4.5 9.5L6 11L11 6L9.5 4.5Z"
        stroke="#b88a38"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ============================================================================
// SCHWEIZER WERTE & TRUST ICONS
// ============================================================================

// 8. Kein IT-Kauderwelsch: Präzision & Direkte Zielführung 
export function IconPraezision({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Outer target ring */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      {/* Inner precision ring */}
      <circle cx="12" cy="12" r="5" stroke="#b88a38" strokeWidth="1.5" strokeDasharray="2 2" />
      {/* Center Bullseye Gold Fill */}
      <circle cx="12" cy="12" r="2.5" fill="#b88a38" />
      {/* Crosshair calibration ticks */}
      <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

// 9. Mobile First auf der Baustelle 
export function IconMobileFirst({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Tablet / Phone Shadow Accent */}
      <rect x="7" y="2" width="12" height="20" rx="3" fill="#b88a38" fillOpacity="0.15" />
      {/* Smartphone unibody */}
      <rect
        x="6"
        y="2"
        width="12"
        height="20"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      {/* Screen area line */}
      <path d="M6 5H18M6 18H18" stroke="currentColor" strokeWidth="1.25" opacity="0.4" />
      {/* Dynamic Island / speaker */}
      <rect x="10" y="3.5" width="4" height="1" rx="0.5" fill="currentColor" />
      {/* Home touch indicator */}
      <path d="M10.5 19.5H13.5" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" />
      {/* Signal / WiFi wave badge */}
      <path d="M14 8C14.8 8.8 14.8 10.2 14 11" stroke="#b88a38" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="9.5" r="1" fill="#b88a38" />
    </svg>
  )
}

// 10. 100% Schweizer Datenschutz (DSG) 
export function IconDatenschutz({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Security Shield Fill */}
      <path
        d="M12 2L4 5.5V11.5C4 16.5 7.4 20.8 12 22C16.6 20.8 20 16.5 20 11.5V5.5L12 2Z"
        fill="#b88a38"
        fillOpacity="0.18"
      />
      {/* Security Shield Outline */}
      <path
        d="M12 2L4 5.5V11.5C4 16.5 7.4 20.8 12 22C16.6 20.8 20 16.5 20 11.5V5.5L12 2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Padlock Shackle */}
      <path
        d="M9.5 11V9C9.5 7.6 10.6 6.5 12 6.5C13.4 6.5 14.5 7.6 14.5 9V11"
        stroke="#b88a38"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Padlock Body */}
      <rect
        x="8.5"
        y="11"
        width="7"
        height="5.5"
        rx="1.5"
        fill="currentColor"
      />
      {/* Keyhole */}
      <circle cx="12" cy="13.25" r="0.75" fill="#fff" />
      <path d="M12 14V15.25" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}

// 11. Support aus der Schweiz (Schweizer Wappen & Persönliche Betreuung, Ersetzt "CH")
export function IconSwissSupport({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Swiss Shield Silhouette */}
      <path
        d="M12 2.5C7 2.5 4 4 4 8C4 15 8.5 19.5 12 21.5C15.5 19.5 20 15 20 8C20 4 17 2.5 12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Shield Accent Backing */}
      <path
        d="M12 2.5C7 2.5 4 4 4 8C4 15 8.5 19.5 12 21.5C15.5 19.5 20 15 20 8C20 4 17 2.5 12 2.5Z"
        fill="#b88a38"
        fillOpacity="0.18"
      />
      {/* Swiss Cross (White/Gold Precision) */}
      <path
        d="M10 6.5H14V9.5H17V13.5H14V16.5H10V13.5H7V9.5H10V6.5Z"
        fill="#b88a38"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ============================================================================
// BAUSTELLEN & FEATURE ICONS (Ersetzt , ️)
// ============================================================================

// 12. Foto-Dokumentation & Beleg-Scanner 
export function IconPhotoScanner({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Viewfinder Corners (Scanner Framing) */}
      <path d="M4 8V5C4 4.44772 4.44772 4 5 4H8" stroke="#b88a38" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 4H19C19.5523 4 20 4.44772 20 5V8" stroke="#b88a38" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 16V19C20 19.5523 19.5523 20 19 20H16" stroke="#b88a38" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 20H5C4.44772 20 4 19.5523 4 19V16" stroke="#b88a38" strokeWidth="2" strokeLinecap="round" />
      {/* Camera Body Inside */}
      <rect x="6" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="13" r="2.5" fill="#b88a38" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15.5" cy="11" r="0.75" fill="#b88a38" />
    </svg>
  )
}

// 13. Routen & Google Maps Anbindung 
export function IconMapsRoute({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Dashed Route Path */}
      <path
        d="M4 19C7 19 8 16 11 16C14 16 14 20 18 19"
        stroke="#b88a38"
        strokeWidth="1.75"
        strokeDasharray="2 3"
        strokeLinecap="round"
      />
      {/* Destination Pin */}
      <path
        d="M12 3C8.68629 3 6 5.68629 6 9C6 13.5 12 20 12 20C12 20 18 13.5 18 9C18 5.68629 15.3137 3 12 3Z"
        fill="#b88a38"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="2.5" fill="#b88a38" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

// 14. Digitale Kundenunterschrift (Ersetzt ️)
export function IconDigitalSignature({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Document Baseline */}
      <path d="M4 21H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Signature line flourish */}
      <path
        d="M4 17C6 17 7 14 9 14C11 14 11 18 14 17C16 16.5 17 15 19 16"
        stroke="#b88a38"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stylus / Fountain Pen */}
      <path
        d="M18.5 2.5L21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
        fill="#b88a38"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Nib dot */}
      <circle cx="8.5" cy="15.5" r="0.75" fill="#b88a38" />
    </svg>
  )
}

// ============================================================================
// DYNAMIC TRADE ICON ROUTER (Für Gewerke-Tabs & Registrierungs-Wizard)
// ============================================================================

export function TradeIcon({ tradeId, className = 'w-6 h-6', ...props }) {
  switch (tradeId) {
    case 'schreinerei':
    case 'holzbau':
      return <IconSchreinerei className={className} {...props} />
    case 'maler':
    case 'maler_gipser':
    case 'gipser':
      return <IconMaler className={className} {...props} />
    case 'elektro':
    case 'elektro_installation':
      return <IconElektro className={className} {...props} />
    case 'sanitaer':
    case 'sanitaer_heizung':
    case 'heizung':
      return <IconSanitaer className={className} {...props} />
    case 'gartenbau':
    case 'garten':
      return <IconGartenbau className={className} {...props} />
    case 'bau':
    case 'bauunternehmung':
    case 'bau_renovation':
    case 'renovation':
      return <IconBauunternehmung className={className} {...props} />
    case 'allround':
    default:
      return <IconAllround className={className} {...props} />
  }
}

// ============================================================================
// SUPPLEMENTARY BRAND ICONS (Für Auth, Wizard, Badges & Legal)
// ============================================================================

// 15. Schweizer Flagge / Wappen (Ersetzt keine Windows-CH-Darstellungsprobleme)
export function IconSwissFlag({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#DC2626" />
      <path
        d="M10 6H14V10H18V14H14V18H10V14H6V10H10V6Z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

// 16. Schweizer QR-Rechnung & Beleg 
export function IconQrBill({ className = 'w-6 h-6', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Bill document */}
      <rect x="4" y="2" width="16" height="20" rx="3" fill="#b88a38" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.75" />
      {/* QR Grid lines */}
      <rect x="7" y="5" width="4" height="4" rx="0.5" stroke="#b88a38" strokeWidth="1.5" />
      <rect x="13" y="5" width="4" height="4" rx="0.5" stroke="#b88a38" strokeWidth="1.5" />
      <rect x="7" y="11" width="4" height="4" rx="0.5" stroke="#b88a38" strokeWidth="1.5" />
      {/* Swiss cross mini in QR center */}
      <path d="M14 12H16M15 11V13" stroke="#b88a38" strokeWidth="1.5" strokeLinecap="round" />
      {/* Receipt bottom perforation tear */}
      <path d="M7 18H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 2" />
    </svg>
  )
}

// 17. Energie / ISO-Speed Blitz 
export function IconFlash({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
        fill="#b88a38"
        fillOpacity="0.25"
        stroke="#b88a38"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 18. Sicherheit & DSG Schild (Ersetzt ️ / )
export function IconShieldCheck({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 2L4 5.5V11.5C4 16.5 7.4 20.8 12 22C16.6 20.8 20 16.5 20 11.5V5.5L12 2Z"
        fill="#b88a38"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 11.5L11 13.5L15 9.5"
        stroke="#b88a38"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 19. Handwerker Benutzer-Profil 
export function IconUser({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="7" r="4" fill="#b88a38" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4 21C4 17 7.5 14 12 14C16.5 14 20 17 20 21"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

// 20. Betrieb & Firmen-Gebäude 
export function IconBuilding({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" fill="#b88a38" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 7H10M14 7H16M8 11H10M14 11H16M8 15H10M14 15H16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M10 21V18H14V21" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

// 21. Corporate Design Palette 
export function IconPalette({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 3C7 3 3 7 3 12C3 16 6 19 9 19C10.5 19 11 18 11 17C11 16.5 10.8 16 10.8 15.5C10.8 14.5 11.5 14 12.5 14H14C17.5 14 21 11 21 7C21 4.5 17 3 12 3Z"
        fill="#b88a38"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="9.5" r="1.25" fill="#b88a38" />
      <circle cx="12" cy="7.5" r="1.25" fill="#b88a38" />
      <circle cx="16.5" cy="9.5" r="1.25" fill="#b88a38" />
    </svg>
  )
}

// 22. Suche / Zefix Handelsregister 
export function IconSearch({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="11" cy="11" r="7" fill="#b88a38" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Swiss calibration dot in search */}
      <circle cx="11" cy="11" r="1.5" fill="#b88a38" />
    </svg>
  )
}

// 23. Tipp / Wissens-Glühbirne 
export function IconLightbulb({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M9 18H15M10 21H14M12 2C8.13401 2 5 5.13401 5 9C5 11.3824 6.19018 13.4867 8 14.7369V16C8 16.5523 8.44772 17 9 17H15C15.5523 17 16 16.5523 16 16V14.7369C17.8098 13.4867 19 11.3824 19 9C19 5.13401 15.866 2 12 2Z"
        fill="#b88a38"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="1.5" fill="#b88a38" />
    </svg>
  )
}

// 24. Treuhand & Team 
export function IconTeam({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="9" cy="7" r="3.5" fill="#b88a38" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M2 20C2 16.5 5 14 9 14C13 14 16 16.5 16 20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <path d="M17 14C19.5 14 22 16 22 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

// 25. Keine Kreditkarte nötig 
export function IconCreditCard({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="2" y="5" width="20" height="14" rx="3" fill="#b88a38" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.75" />
      <path d="M2 10H22" stroke="currentColor" strokeWidth="1.75" />
      <rect x="5" y="14" width="4" height="2" rx="0.5" fill="#b88a38" />
      <path d="M16 14H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// 26. Apple / iOS Logo
export function IconApple({ className = 'w-4 h-4', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.13 16.69C20.1 16.78 19.67 18.27 18.71 19.5ZM14.97 4.88C15.56 4.16 15.96 3.16 15.85 2.16C14.99 2.19 13.94 2.73 13.33 3.45C12.79 4.08 12.32 5.1 12.45 6.08C13.41 6.16 14.38 5.6 14.97 4.88Z" />
    </svg>
  )
}

// 27. Android Logo
export function IconAndroid({ className = 'w-4 h-4', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9996.4482.9996.9993.0001.5511-.4485.9997-.9996.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9997.4482.9997.9993 0 .5511-.4486.9997-.9997.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1523-.5676.416.416 0 00-.5676.1523l-2.0223 3.503C15.5902 8.4126 13.8533 8.125 12 8.125c-1.8533 0-3.5902.2876-5.1366.8249L4.8411 5.4469a.4166.4166 0 00-.5677-.1523.4157.4157 0 00-.1522.5676l1.9973 3.4592C2.6889 11.1867 0 14.9546 0 19.375h24c0-4.4204-2.6889-8.1883-6.1185-10.0536" />
    </svg>
  )
}

// 28. Tablet / iPad Icon
export function IconTablet({ className = 'w-4 h-4', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="3" y="2" width="18" height="20" rx="3" fill="#b88a38" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  )
}

// 29. Ordner & Archiv 
export function IconFolder({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M3 7V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V9C21 7.89543 20.1046 7 19 7H12L10 4H5C3.89543 4 3 4.89543 3 6Z"
        fill="#b88a38"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 10H21" stroke="currentColor" strokeWidth="1.25" opacity="0.4" />
      <circle cx="17.5" cy="15.5" r="1.25" fill="#b88a38" />
    </svg>
  )
}

// 30. Kalender & Termine 
export function IconCalendar({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="3" y="4" width="18" height="18" rx="3" fill="#b88a38" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 9H21" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 2V5M16 2V5" stroke="#b88a38" strokeWidth="2" strokeLinecap="round" />
      {/* Calendar dates grid */}
      <circle cx="8" cy="13" r="1" fill="currentColor" />
      <circle cx="12" cy="13" r="1" fill="currentColor" />
      <circle cx="16" cy="13" r="1" fill="#b88a38" />
      <circle cx="8" cy="17" r="1" fill="currentColor" />
      <circle cx="12" cy="17" r="1.5" fill="#b88a38" />
      <circle cx="16" cy="17" r="1" fill="currentColor" />
    </svg>
  )
}

// 31. Stoppuhr & Zeiterfassung (Ersetzt ️)
export function IconClock({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="13" r="8" fill="#b88a38" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 2V4M12 9V13L15 15" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 2H14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M18.5 6.5L19.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// 32. Drucken & PDF Generierung (Ersetzt ️)
export function IconPrinter({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M6 9V3H18V9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="9" width="18" height="10" rx="2" fill="#b88a38" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6 15H18V21H6V15Z" fill="#fff" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <circle cx="18" cy="12" r="1" fill="#b88a38" />
      <path d="M9 18H15" stroke="#b88a38" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// 33. E-Mail & Versand (Ersetzt ️)
export function IconMail({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" fill="#b88a38" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 7L12 13L21 7" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// 34. Hinzufügen / Neue Zeile 
export function IconPlus({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="12" r="9" fill="#b88a38" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8V16M8 12H16" stroke="#b88a38" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// 35. Löschen / Papierkorb (Ersetzt ️)
export function IconTrash({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M4 6H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M10 3H14M9 3H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M6 6L7 19C7 20.1 7.9 21 9 21H15C16.1 21 17 20.1 17 19L18 6"
        fill="#b88a38"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 10V16M14 10V16" stroke="#b88a38" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// 36. Katalog & Leistungspositionen 
export function IconBook({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M4 19.5C4 18.1193 5.11929 17 6.5 17H20V4H6.5C5.11929 4 4 5.11929 4 6.5V19.5Z"
        fill="#b88a38"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M4 19.5C4 20.8807 5.11929 22 6.5 22H20V17H6.5C5.11929 17 4 17.5 4 19.5Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8H16M8 12H13" stroke="#b88a38" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// 37. Bearbeiten / Stift (Ersetzt ️)
export function IconEdit({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M16.5 3.5C16.8978 3.10217 17.4374 2.87868 18 2.87868C18.5626 2.87868 19.1022 3.10217 19.5 3.5C19.8978 3.89783 20.1213 4.43739 20.1213 5C20.1213 5.56261 19.8978 6.10217 19.5 6.5L7 19L3 20L4 16L16.5 3.5Z"
        fill="#b88a38"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 6L18 10" stroke="#b88a38" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// 38. Speichern / Diskette 
export function IconSave({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z"
        fill="#b88a38"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M17 21V13H7V21" fill="#fff" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 3V8H14V3" stroke="#b88a38" strokeWidth="1.75" />
    </svg>
  )
}

// 39. Spracheingabe / Mikrofon (Ersetzt ️)
export function IconMic({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="#b88a38" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.75" />
      <path d="M5 10C5 13.866 8.13401 17 12 17C15.866 17 19 13.866 19 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 17V21M8 21H16" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

// 40. Bank / Finanzkonto 
export function IconBank({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M3 9.5L12 4L21 9.5H3Z" fill="#b88a38" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M5 10V18M10 10V18M14 10V18M19 10V18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M2 19H22M3 21H21" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

// 41. Bestätigung & Erfolg (Ersetzt / )
export function IconCheck({ className = 'w-4 h-4', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M20 6L9 17L4 12"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 42. Warnung & Beachtung (Ersetzt ️)
export function IconWarning({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 3L22 20H2L12 3Z"
        fill="#b88a38"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 9V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="#b88a38" />
    </svg>
  )
}

// 43. Kalkulation & Betrag 
export function IconMoney({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="12" r="9" fill="#b88a38" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.75" />
      {/* Swiss Franc / Currency Glyph */}
      <path d="M9 8H15M9 12H13.5M9 8V16" stroke="#b88a38" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// 44. Duplizieren / Kopiervorlage 
export function IconDuplicate({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="8" y="8" width="13" height="13" rx="2" fill="#b88a38" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 16V5C4 3.9 4.9 3 6 3H17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12 12H17M12 15H15" stroke="#b88a38" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// 45. Paket & Sendung 
export function IconPackage({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z"
        fill="#b88a38"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 12L20 7.5M12 12V21M12 12L4 7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7.5 5.5L15.5 10" stroke="#b88a38" strokeWidth="1.5" />
    </svg>
  )
}

// 46. Wiederherstellen & Synchronisation (Ersetzt ️)
export function IconRefresh({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M4 12C4 7.58172 7.58172 4 12 4C15.4 4 18.28 6.12 19.4 9.1M20 12C20 16.4183 16.4183 20 12 20C8.6 20 5.72 17.88 4.6 14.9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M20 5V9H16M4 19V15H8" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// 47. Vorschau & Ansicht (Ersetzt ️)
export function IconEye({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"
        fill="#b88a38"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="1.25" fill="#b88a38" />
    </svg>
  )
}

// 48. Dashboard Cockpit 
export function IconDashboard({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect x="3" y="3" width="8" height="8" rx="2" fill="#b88a38" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="10" width="8" height="11" rx="2" fill="#b88a38" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="7" cy="7" r="1" fill="#b88a38" />
      <path d="M16 15H18" stroke="#b88a38" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// 49. Dokument / Offerte 
export function IconDocument({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        fill="#b88a38"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13H16M8 17H13" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

// 50. Buchhaltung / Finanzen / Graph 
export function IconChart({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M3 20H21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <rect x="5" y="11" width="3.5" height="9" rx="1" fill="#b88a38" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="6" width="3.5" height="14" rx="1" fill="#b88a38" stroke="#b88a38" strokeWidth="1.5" />
      <rect x="16" y="9" width="3.5" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8L10.5 4L16 7L21 2" stroke="#b88a38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// 51. Katalog / Preisschild (Ersetzt ️)
export function IconTag({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M20.59 13.41L13.42 20.58C13.04 20.96 12.53 21.17 12 21.17C11.47 21.17 10.96 20.96 10.59 20.59L2.41 12.41C2.15 12.15 2 11.79 2 11.41V4C2 2.9 2.9 2 4 2H11.41C11.79 2 12.15 2.15 12.41 2.41L20.59 10.59C21.37 11.37 21.37 12.63 20.59 13.41Z"
        fill="#b88a38"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="7" r="1.5" fill="#b88a38" />
    </svg>
  )
}

// 52. Einstellungen / Präzisions-Zahnrad (Ersetzt ️)
export function IconSettings({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="12" r="3.5" fill="#b88a38" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M19.4 15C19.49 14.34 19.54 13.68 19.54 13C19.54 12.33 19.49 11.66 19.4 11L21.54 9.34C21.73 9.19 21.79 8.92 21.66 8.7L19.66 5.24C19.54 5.01 19.27 4.93 19.04 5.02L16.53 6.03C15.86 5.51 15.12 5.09 14.32 4.79L13.94 2.11C13.9 1.86 13.68 1.67 13.43 1.67H9.43C9.18 1.67 8.96 1.86 8.92 2.11L8.54 4.79C7.74 5.09 7 5.52 6.33 6.03L3.82 5.02C3.59 4.93 3.32 5.02 3.2 5.24L1.2 8.7C1.07 8.92 1.13 9.19 1.32 9.34L3.46 11C3.37 11.67 3.32 12.34 3.32 13C3.32 13.66 3.37 14.33 3.46 15L1.32 16.66C1.13 16.81 1.07 17.08 1.2 17.3L3.2 20.76C3.32 20.99 3.59 21.07 3.82 20.98L6.33 19.97C7 20.48 7.74 20.91 8.54 21.21L8.92 23.89C8.96 24.14 9.18 24.33 9.43 24.33H13.43C13.68 24.33 13.9 24.14 13.94 23.89L14.32 21.21C15.12 20.91 15.87 20.49 16.53 19.97L19.04 20.98C19.27 21.07 19.54 20.98 19.66 20.76L21.66 17.3C21.79 17.08 21.73 16.81 21.54 16.66L19.4 15Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="1.5" fill="#b88a38" />
    </svg>
  )
}

// 53. Ort / Baustelle / Pin 
export function IconLocation({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 21C16 16.5 19 13 19 9C19 5.13401 15.866 2 12 2C8.13401 2 5 5.13401 5 9C5 13 8 16.5 12 21Z"
        fill="#b88a38"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="2.5" fill="#b88a38" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

// 54. Anhang / Beleg / Büroklammer 
export function IconAttachment({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M21.44 11.05L12.25 20.24C10.1 22.39 6.61 22.39 4.46 20.24C2.31 18.09 2.31 14.6 4.46 12.45L13.65 3.26C15.02 1.89 17.25 1.89 18.62 3.26C19.99 4.63 19.99 6.86 18.62 8.23L9.43 17.42C8.75 18.1 7.63 18.1 6.95 17.42C6.27 16.74 6.27 15.62 6.95 14.94L15.43 6.46"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12.25" cy="20.24" r="1.5" fill="#b88a38" />
    </svg>
  )
}

// 55. Notizen / Baustellenrapport Notiz 
export function IconNotes({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M16 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V8L16 3Z"
        fill="#b88a38"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M16 3V8H21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 12H15M7 16H12" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M18 14L15 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// 56. KI & Intelligente Assistenten 
export function IconSparkles({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 2L14.2 8.3C14.5 9.1 15.1 9.7 15.9 10L22 12L15.9 14C15.1 14.3 14.5 14.9 14.2 15.7L12 22L9.8 15.7C9.5 14.9 8.9 14.3 8.1 14L2 12L8.1 10C8.9 9.7 9.5 9.1 9.8 8.3L12 2Z"
        fill="#b88a38"
        fillOpacity="0.25"
        stroke="#b88a38"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M19 17L19.8 19.2C19.9 19.5 20.1 19.7 20.4 19.8L22.6 20.6L20.4 21.4C20.1 21.5 19.9 21.7 19.8 22L19 24.2L18.2 22C18.1 21.7 17.9 21.5 17.6 21.4L15.4 20.6L17.6 19.8C17.9 19.7 18.1 19.5 18.2 19.2L19 17Z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="1.5" fill="#b88a38" />
    </svg>
  )
}

// 57. Schliessen & Entfernen 
export function IconClose({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// 58. Monteur & Handwerker mit Helm 
export function IconWorker({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Hardhat / Schutzhelm */}
      <path
        d="M6 10C6 6.68629 8.68629 4 12 4C15.3137 4 18 6.68629 18 10V11H6V10Z"
        fill="#b88a38"
        fillOpacity="0.3"
        stroke="#b88a38"
        strokeWidth="1.75"
      />
      <path d="M4 11H20" stroke="#b88a38" strokeWidth="2" strokeLinecap="round" />
      {/* Face & Ears */}
      <path d="M7 11V13.5C7 16.2614 9.23858 18.5 12 18.5C14.7614 18.5 17 16.2614 17 13.5V11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      {/* Shoulders */}
      <path d="M4 22C4 19.5 7.5 18.5 12 18.5C16.5 18.5 20 19.5 20 22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

// 59. Verrechnet & Geschäftlich 
export function IconBriefcase({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect
        x="3"
        y="7"
        width="18"
        height="14"
        rx="3"
        fill="#b88a38"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M3 12H21" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="10.5" width="3" height="3" rx="0.75" fill="#b88a38" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

// 60. Bild / Foto / Baustellenaufnahme (Ersetzt ️)
export function IconImage({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3"
        fill="#b88a38"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="8.5" cy="8.5" r="1.5" fill="#b88a38" />
      <path
        d="M21 16L16.5 11.5L7 21M3 17L9 13L13.5 17.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 61. Schloss / Sicherheit / Datenschutz 
export function IconLock({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2.5"
        fill="#b88a38"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15.5" r="1.25" fill="#b88a38" />
      <path d="M12 16.75V18.5" stroke="#b88a38" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// 62. Telefon / Anruf 
export function IconPhone({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M22 16.92V19.92C22 20.48 21.54 20.94 20.98 20.92C17.75 20.73 14.65 19.63 11.95 17.7C9.5 15.96 7.46 13.92 5.72 11.47C3.79 8.77 2.69 5.67 2.5 2.44C2.48 1.88 2.94 1.42 3.5 1.42H6.5C7.01 1.42 7.44 1.8 7.49 2.31C7.58 3.29 7.82 4.25 8.2 5.16C8.33 5.48 8.25 5.86 8 6.11L6.73 7.38C8.25 10.05 10.45 12.25 13.12 13.77L14.39 12.5C14.64 12.25 15.02 12.17 15.34 12.3C16.25 12.68 17.21 12.92 18.19 13.01C18.7 13.06 19.08 13.49 19.08 14V16.92H22Z"
        fill="#b88a38"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// 63. Hammer / Werkzeug 
export function IconHammer({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M15 4L18 7L16 9L13 6L15 4Z"
        fill="#b88a38"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M18 7L21 4L19 2L15 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 7.5L5 17L3 21L7 19L16.5 9.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="6" r="1" fill="#b88a38" />
    </svg>
  )
}

// 64. Thermometer / Temperatur (Ersetzt ️)
export function IconThermometer({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M14 14.76V5C14 3.9 13.1 3 12 3C10.9 3 10 3.9 10 5V14.76C8.8 15.65 8 17.2 8 19C8 21.2 9.8 23 12 23C14.2 23 16 21.2 16 19C16 17.2 15.2 15.65 14 14.76Z"
        fill="#b88a38"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="19" r="2.5" fill="#b88a38" />
      <path d="M12 11V16.5" stroke="#b88a38" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// 65. Wetter-Icons (Swiss Clean Vectors)
export function IconSun({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="12" r="4.5" fill="#b88a38" fillOpacity="0.25" stroke="#b88a38" strokeWidth="1.75" />
      <path d="M12 2V4M12 20V22M4 12H2M22 12H20M6.34 6.34L4.93 4.93M19.07 19.07L17.66 17.66M6.34 17.66L4.93 19.07M19.07 4.93L17.66 6.34" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

export function IconCloud({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M17.5 19H6C3.79086 19 2 17.2091 2 15C2 13.0487 3.39864 11.4241 5.25983 11.0772C5.08977 10.4286 5 9.74971 5 9.05C5 5.70868 7.68629 3 11 3C13.8055 3 16.1627 4.92051 16.8375 7.54589C17.2039 7.41908 17.5944 7.35 18 7.35C20.2091 7.35 22 9.14086 22 11.35C22 13.5591 20.2091 15.35 18 15.35H17.5V19Z"
        fill="#b88a38"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconCloudRain({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M16 16H6C3.79086 16 2 14.2091 2 12C2 10.0487 3.39864 8.4241 5.25983 8.0772C5.08977 7.4286 5 6.74971 5 6.05C5 2.70868 7.68629 0 11 0C13.8055 0 16.1627 1.92051 16.8375 4.54589C17.2039 4.41908 17.5944 4.35 18 4.35C20.2091 4.35 22 6.14086 22 8.35C22 10.5591 20.2091 12.35 18 12.35H16"
        transform="translate(0, 2)"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 17L7 21M12 17L11 21M16 17L15 21" stroke="#b88a38" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function IconWeather({ condition, className = 'w-5 h-5', ...props }) {
  const c = condition?.toLowerCase() || ''
  if (c.includes('clear')) return <IconSun className={className} {...props} />
  if (c.includes('rain') || c.includes('drizzle')) return <IconCloudRain className={className} {...props} />
  return <IconCloud className={className} {...props} />
}

// 66. Navigation Icon Resolver
export function IconNav({ id, className = 'w-5 h-5', ...props }) {
  switch (id) {
    case 'dashboard':
      return <IconDashboard className={className} {...props} />
    case 'kunden':
      return <IconTeam className={className} {...props} />
    case 'projekte':
      return <IconBauunternehmung className={className} {...props} />
    case 'kalender':
      return <IconCalendar className={className} {...props} />
    case 'offerten':
      return <IconDocument className={className} {...props} />
    case 'rechnungen':
      return <IconQrBill className={className} {...props} />
    case 'buchhaltung':
      return <IconChart className={className} {...props} />
    case 'dateien':
      return <IconFolder className={className} {...props} />
    case 'katalog':
      return <IconTag className={className} {...props} />
    case 'einstellungen':
      return <IconSettings className={className} {...props} />
    case 'fotos':
      return <IconPhotoScanner className={className} {...props} />
    default:
      return <IconPraezision className={className} {...props} />
  }
}

// 67. Aufmass & Massstab 
export function IconRuler({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M3 17L17 3L21 7L7 21L3 17Z"
        fill="#b88a38"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7 7L9 9M10 10L13 13M14 14L16 16M11 5L12 6M15 9L16 10" stroke="#b88a38" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// 68. Rapport & Baustellenbericht 
export function IconRapport({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      {/* Clipboard board */}
      <rect
        x="4"
        y="4"
        width="16"
        height="17"
        rx="2.5"
        fill="#b88a38"
        fillOpacity="0.16"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      {/* Top Clip */}
      <path
        d="M9 4.5C9 3.67157 9.67157 3 10.5 3H13.5C14.3284 3 15 3.67157 15 4.5V5.5H9V4.5Z"
        fill="#b88a38"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Checklist items */}
      <path d="M8 10L9.5 11.5L12 9" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10H16.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.6" />
      <path d="M8 15L9.5 16.5L12 14" stroke="#b88a38" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 15H16.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

// 69. Lieferung & Material-Transport (Ersetzt LKW)
export function IconTruck({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <rect
        x="2"
        y="6"
        width="11"
        height="10"
        rx="1.5"
        fill="#b88a38"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M13 9H18.5L21.5 12.5V16H13V9Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 10.5H17.5L19.5 13H14.5V10.5Z"
        fill="#b88a38"
        fillOpacity="0.4"
      />
      <circle cx="17.5" cy="17.5" r="2" fill="white" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="6.5" cy="17.5" r="2" fill="white" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

// 70. Kaffeepause & Mittagsrast (Ersetzt Kaffeetasse)
export function IconCoffee({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M4 8H18V13C18 16.3137 15.3137 19 12 19C8.68629 19 6 16.3137 6 13V8H4Z"
        fill="#b88a38"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M18 10H19.5C20.6046 10 21.5 10.8954 21.5 12C21.5 13.1046 20.6046 14 19.5 14H18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path d="M9 3V5M13 2.5V5.5" stroke="#b88a38" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 21H21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

// 71. Universelles Termin-Typ Icon
export function TerminTypIcon({ typ, className = 'w-4 h-4', ...props }) {
  switch (typ) {
    case 'Montage':
      return <IconHammer className={className} {...props} />
    case 'Aufmass':
      return <IconRuler className={className} {...props} />
    case 'Kundentermin':
      return <IconTeam className={className} {...props} />
    case 'Lieferung':
      return <IconTruck className={className} {...props} />
    case 'Abnahme':
      return <IconRapport className={className} {...props} />
    case 'Intern':
      return <IconBuilding className={className} {...props} />
    case 'Urlaub':
      return <IconSun className={className} {...props} />
    default:
      return <IconLocation className={className} {...props} />
  }
}

// 72. Globus & Internet (Ersetzt Globus-Emoji)
export function IconGlobe({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3.6 9H20.4M3.6 15H20.4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="4.5"
        ry="9"
        fill="#b88a38"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  )
}

// 73. Kamera & Fotoaufnahme
export function IconCamera({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M4 8H7L8.5 5.5H15.5L17 8H20C21.1046 8 22 8.89543 22 10V19C22 20.1046 21.1046 21 20 21H4C2.89543 21 2 20.1046 2 19V10C2 8.89543 2.89543 8 4 8Z"
        fill="#b88a38"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="14.5"
        r="4"
        fill="#b88a38"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="14.5" r="1.5" fill="currentColor" />
      <circle cx="18.5" cy="11.5" r="0.75" fill="currentColor" />
    </svg>
  )
}

// 74. Verknüpfung & URL-Link
export function IconLink({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M10 13C10.4578 13.6141 11.0474 14.1182 11.7275 14.4771C12.4076 14.836 13.1593 15.0404 13.9298 15.076C14.7003 15.1116 15.4697 14.9774 16.1837 14.6828C16.8977 14.3882 17.5376 13.9409 18.058 13.372L20.058 11.19C21.0594 10.0984 21.5645 8.63188 21.4647 7.10543C21.3649 5.57898 20.6677 4.10237 19.5226 3.00392C18.3776 1.90547 16.8687 1.26577 15.3197 1.22153C13.7707 1.17728 12.2961 1.73177 11.213 2.766L9.626 4.314"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M14 11C13.5422 10.3859 12.9526 9.88177 12.2725 9.5229C11.5924 9.16403 10.8407 8.95963 10.0702 8.92401C9.29973 8.88839 8.53034 9.02264 7.81632 9.31722C7.1023 9.6118 6.46237 10.0591 5.942 10.628L3.942 12.81C2.94061 13.9016 2.43549 15.3681 2.53531 16.8946C2.63514 18.421 3.33235 19.8976 4.47738 20.9961C5.62241 22.0945 7.13133 22.7342 8.68032 22.7785C10.2293 22.8227 11.7039 22.2682 12.787 21.234L14.374 19.686"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M8.5 15.5L15.5 8.5"
        stroke="#b88a38"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

// 75. Recht & Aufbewahrungspflicht (Waage)
export function IconLegal({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path d="M12 3V21M7 21H17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M4 7H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M4 7L2 13H8L6 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2 13C2 14.6569 3.34315 16 5 16C6.65685 16 8 14.6569 8 13" fill="#b88a38" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 7L18 13H24L22 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18 13C18 14.6569 19.3431 16 21 16C22.6569 16 24 14.6569 24 13" fill="#b88a38" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="4" r="1.5" fill="#b88a38" />
    </svg>
  )
}

// 76. Info & Hinweis
export function IconInfo({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8V8.01" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M12 11V16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="12" r="6" fill="#b88a38" fillOpacity="0.15" />
    </svg>
  )
}

// 77. Sicherheit & Schutz (Shield)
export function IconShield({ className = 'w-5 h-5', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...props}>
      <path
        d="M12 22S4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 22S4 18 4 12V5L12 2L20 5V12C20 18 12 22 12 22Z"
        fill="#b88a38"
        fillOpacity="0.2"
      />
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}


