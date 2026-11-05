# Kinetic Craft – Project Guidelines & Anti-Slop Design System

These rules are permanent guidelines for this codebase. Follow them on every screen, component, refactor, and copy change.

---

## 1. Anti-Slop UI & Visual Guidelines

Avoid the generic "AI-generated / vibecoded" aesthetic. Kinetic Craft is a precision Swiss software product designed for craftsmen, construction companies, and trustees.

* **No AI Gradient Clichés**:
  * No purple-to-blue gradients, no gradient text, no colored glows (`shadow-purple-500/50`), and no blurred ambient background blobs or nebulas.
  * Use quiet, high-contrast surfaces (Space Black Titanium, clean neutrals, or crisp white) with subtle hairline borders (6%–10% opacity, `border-border`).
* **No Decorative Emojis or Sparkles**:
  * Do NOT use emojis (`✨`, `🚀`, `💡`, `🔥`) as icons, button labels, or status indicators.
  * Use consistent SVG line icons from the existing design system (`components/icons/BrandIcons.jsx`) with uniform stroke width and sizing. Where an icon does not add functional clarity, omit it.
* **No Arbitrary Badges**:
  * Do NOT add "New", "Pro", "Beta", or "AI" badges unless explicitly tracking a real system capability or subscription tier.
  * Status badges must reflect real database states (`Entwurf`, `Versendet`, `Bezahlt`, `Überfällig`, `Angenommen`).
* **Component Restraint & Radius Hierarchy**:
  * Do not make every button or card a full pill (`rounded-full`). Use proportional corner radii (`rounded-xl` for cards, `rounded-lg` for inputs/buttons).
  * Nested corner radii must fit inside each other (outer radius > inner radius).
  * Create depth through surface elevation and tonal contrast, not exaggerated box-shadows or neon glows.

---

## 2. Color System & Contrast Rules

* **Palette Structure**:
  * **1 Neutral Ramp**: Tinted toward the product's world (Space Black Titanium for dark mode, warm architectural gray/slate for light mode).
  * **3 Text Roles**: Primary (`text-text-primary`), Secondary (`text-text-secondary`), Muted (`text-text-muted`).
  * **1 Accent Color**: Desert Titanium Gold (`#b88a38`) or the active tenant's primary color.
* **One Bright Moment Per Screen**:
  * On any view, rich color belongs strictly to the primary actionable element (e.g., the primary submit button, an active status badge, or key chart line).
  * Everything around it remains quiet: navigation sidebar, secondary buttons, toolbars, and borders must use the neutral scale.
* **Readable Charts**:
  * No rainbow bars, no neon glow, and no pill-shaped bars.
  * Use a muted, subtle grid, quiet axis labels, and a single distinct highlight color for the metric that matters.

---

## 3. Spacing & Typography

* **Strict 4px Spacing Grid**:
  * All margins, paddings, gaps, and heights must be multiples of 4px (`gap-1`, `gap-2`, `gap-3`, `gap-4`, `p-4`, `p-6`, etc.).
  * No arbitrary or one-off values (e.g. `13px`, `7px`).
  * Lists and tables share uniform row heights; cards in a row share uniform padding.
* **Space Demonstrates Grouping**:
  * Space *inside* a group must always be smaller than space *between* groups. Section labels sit closer to their own items than to the section preceding them.
* **Type Hierarchy**:
  * Limit to maximum 4–5 sizes across the entire view.
  * Restrict font weights to **400 (regular)** and **500/600 (medium/semibold)**. Headings gain visual prominence through size, letter-spacing, and line-height, never through weight 800 or 900.
  * Use **Sentence case** for labels, buttons, and navigation (e.g. "Ausgabe erfassen", not "AUSGABE ERFASSEN").

---

## 4. Copywriting & Communication

* **Ban Marketing Hype**:
  * Never use generic tech buzzwords: *supercharge, seamless, unlock, magic, game-changer, all-in-one revolution*.
  * No unnecessary exclamation marks. No empty greeting headlines ("Good morning, user!").
* **Concrete Functional Copy**:
  * Every headline and description must state exactly **what** the product does and **for whom** in terms specific to Swiss craft and business:
    * *«SIA 118 Art. 141 Ausmassrechner mit automatischem Flächenabzug»* (not *«Smarter Aufmass-Assistent»*).
    * *«Offizieller 105 mm Schweizer QR-Zahlteil nach ISO 20022»* (not *«Magische Rechnungsstellung»*).
    * *«1-Klick Treuhand-ZIP-Export für Banana & Abacus»* (not *«Mühelose Buchhaltung»*).
* **Authentic Swiss Data**:
  * Use realistic Swiss numbers, dates (`DD.MM.YYYY`), cantons, street names, UID numbers (`CHE-123.456.789 MWST`), and currency (`CHF` with 5-Rappen-Rundung).

---

## 5. Landing Pages & Visual Presentation

* **Real Product Over Abstract Blobs**:
  * Hero sections must show the **actual product interface** with realistic data or a real physical object from the craft world (tools, architectural drawings, Swiss QR-bill).
  * Absolutely no 3D floating spheres, neon robots, glowing brains, or abstract floating shapes.
* **Honest Social Proof**:
  * Never invent fake quotes or badges like "Trusted by 10,000+ teams".
  * Anchor trust in verified Swiss standards: **GeBüV Art. 957a OR**, **SIA 118**, **SIX Swiss Payment Standards**, and **nDSG**.
