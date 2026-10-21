---
name: Executive Precision
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#444748'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#5c5f60'
  on-secondary: '#ffffff'
  secondary-container: '#dee0e2'
  on-secondary-container: '#606365'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001849'
  on-tertiary-container: '#447cff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#e1e2e4'
  secondary-fixed-dim: '#c5c6c8'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#444749'
  tertiary-fixed: '#dae1ff'
  tertiary-fixed-dim: '#b3c5ff'
  on-tertiary-fixed: '#001849'
  on-tertiary-fixed-variant: '#003fa4'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  stat-metric:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  stat-metric-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-default:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-tabular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0em
  body-muted:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers an institutional-grade, modern fintech experience tailored for high-clarity financial management. Built at the intersection of Mercury’s clean restraint, Linear’s surgical focus, and shadcn/ui’s crisp architectural discipline, the visual tone conveys trust, mathematical certainty, and effortless control.

The style is characterized by:
- **Quiet Precision:** High-contrast, monochromatic structural foundations paired with highly targeted, functional semantic accents.
- **Generous Architectural Breathing Room:** Uncrowded data displays that reduce cognitive load during high-stakes financial operations.
- **Refined Materiality:** Pure white layered surfaces floating over soft canvas tones, defined by hairline strokes and micro-diffused ambient depth rather than structural color fills.
- **Data-First Utility:** Financial numbers, transaction states, and ledger rows are treated with optical balance, tabular consistency, and zero extraneous decorative noise.

## Colors

The palette employs a stark, modern light mode optimized for dense numerical readability and clear status identification:

- **Canvas Background (`#FAFAFA`):** An ultra-soft off-white baseline that eliminates display glare while providing natural separation for elevated cards.
- **Surfaces & Cards (`#FFFFFF`):** High-purity white used for primary containment panels, metric containers, and modal sheets.
- **Borders & Dividers (`#E5E7EB`):** Hairline structural outlines establishing card parameters and cell boundaries without competing with typographic values.
- **Text Primary (`#111827`):** Deep charcoal ink delivering accessible, crisp contrast for all labels, primary titles, and numerical values.
- **Text Muted (`#6B7280`):** Secondary slate tone reserved for timestamps, metadata, masked account numbers, and table headers.
- **Semantic Accents:**
  - **Positive / Inflow (`#00C950`):** Used strictly for realized income, positive balance trajectories, and verified states.
  - **Negative / Outflow (`#FF3B30`):** Applied to expense outflows, budget overages, error banners, and critical account alerts.
  - **Focus & Action (`#0066FF`):** Reserved for active focus rings, interactive text links, and ongoing synchronization pulses.
  - **Warning & Pending (`#F59E0B`):** Applied to pending settlement states, manual transaction reviews, and account connection notices.

## Typography

The type system relies on `Inter` across all structural layers to maximize legibility and systematic unity.

- **Tabular Figures (`tnum`):** All financial metrics, balances, percentage deltas, ledger transactions, and timestamps must render with font feature setting `"tnum" on` enabled. This guarantees column-level alignment across varying digits.
- **Metric Weighting:** Quantitative metrics (account values, net worth, ledger sums) strictly employ `600` (Semi-bold) to preserve hierarchy above secondary metadata.
- **Canadian Currency Conventions:** Canadian dollar values must use standard clean formatting without separating spaces between the sign, symbol, and digit: `-$42.38 CAD` or `+$1,240.00 CAD`. Positive deltas display an explicit `+`, while negative charges prepend `-` prior to the currency symbol.
- **Masked Data Integrity:** Account numbers utilize tabular monospace dot sequences or standard asterisks (`****2509`) to maintain stable line lengths in account rows.

## Layout & Spacing

The layout model is anchored on a rigid 4px/8px mathematical cadence embedded within a 12-column responsive fluid grid.

- **Desktop (>= 1280px):** 12 columns, 24px gutters, 32px canvas margins. Metric stat strips display as 3 or 4 uniform columns spanning the full content width.
- **Tablet (768px - 1279px):** 8 columns, 20px gutters, 24px canvas margins. Metric grids collapse to a 2x2 layout.
- **Mobile (< 768px):** 4 columns, 16px gutters, 16px canvas margins. Dashboard stat cards convert to single-column vertical stacks or horizontal carousels with edge-to-edge margins.
- **Component Padding Scale:**
  - Card containers adhere strictly to `1.5rem` (`24px`) padding desktop, scaling down to `1rem` (`16px`) on mobile devices.
  - Interactive table rows maintain a fixed height of `48px` to `56px` with `1rem` horizontal padding to allow scanability.

## Elevation & Depth

Visual depth avoids thick drop-shadows or exaggerated skeuomorphism, prioritizing sharp planar boundaries and low-contrast ambient diffusion:

- **Flat Canvas (`#FAFAFA`):** The ground level where navigational structures and utility controls sit.
- **Surface Elevation (Cards & Panels):** Pure `#FFFFFF` surfaces bounded by a 1px solid stroke in `#E5E7EB`. Surfaces use an ambient shadow formula: `box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.02)`.
- **Floating Overlays & Popovers:** Dropdowns, calendar pickers, and tooltips cast a calibrated shadow: `box-shadow: 0px 8px 16px -4px rgba(0, 0, 0, 0.06), 0px 2px 4px -1px rgba(0, 0, 0, 0.03)`, retaining the 1px border.
- **Focus Hierarchy:** Modals and drawer panels layer directly over a backdrop filter: `rgba(17, 24, 39, 0.4)` with an integrated `backdrop-filter: blur(4px)`.

## Shapes

The design system incorporates geometric softness balanced by precision borders:

- **Standard Cards & Containers:** Fixed at `16px` (`rounded-2xl`). This curvature provides an organic framing for dense numerical dashboards without clipping inner content.
- **Buttons, Inputs & Dropdowns:** Standardized at `8px` (`rounded-md` / `rounded-lg`) to preserve ergonomic tactile familiarity and clean interaction bounding boxes.
- **Badges, Status Pills & Chips:** Fully pill-shaped (`9999px`) to visually differentiate qualitative tags and transaction categories from actionable rectangular elements.

## Components

### Buttons
- **Primary:** Solid `#111111` background, `#FFFFFF` text, `8px` corner radius, font weight `500`. Hover state transitions to `#262626`. Focus state renders a 2px offset ring in `#0066FF`.
- **Secondary / Subdued:** `#F3F4F6` background, `#111827` text. Hover transitions to `#E5E7EB`.
- **Outline / Ghost:** Transparent background with a 1px border in `#E5E7EB`. Hover fills with `#FAFAFA`.

### Financial Metric Stat Cards
- Enclosed within a `16px` rounded white container with a 1px border `#E5E7EB`.
- Contains a muted category label (`label-md`), the primary tabular metric (`stat-metric`), and an integrated delta pill badge (e.g., `+12.4% vs last month` with a soft `#00C950` tinted background).

### Badges & Status Pills
- **Inflow / Credit:** `#E6F9EE` background with `#00A340` text.
- **Outflow / Debit:** `#FEECEC` background with `#DC2626` text.
- **Pending / In Review:** `#FEF3C7` background with `#D97706` text.
- **Institution Badge:** Used for institution attribution (e.g., `CIBC Chequing • ****2509`) with an `#F3F4F6` background, `#374151` text, and an inline monochrome bank logo icon.

### Progress Bars & Budget Gauges
- Track baseline is `6px` in height with full pill rounding (`9999px`) in `#F3F4F6`.
- Value fill uses `#111111` for standard pacing, `#00C950` for savings milestones, and transitions dynamically to `#FF3B30` when the allocated budget exceeds 100%.

### Tabular Ledger & Lists
- Table headers use uppercase `label-sm` in `#6B7280` with a 1px bottom border `#E5E7EB`.
- Transaction items feature horizontal row layout: Institution or merchant icon (32px circle), description and account suffix (`CIBC ****2509`), category chip, and right-aligned tabular currency value with bold `600` weight.
- Negative values format cleanly with leading minus symbols: `-$42.38 CAD`.

### Input Fields & Controls
- Height: `40px` with a 1px border in `#E5E7EB`, `#FFFFFF` surface, and `8px` corner radius.
- Interactive states: Hover transitions border to `#D1D5DB`; active focus replaces border with `#0066FF` plus a matching `2px` focus shadow ring.
- Numeric and currency inputs automatically prepend the localized symbol (`$`) fixed in `#6B7280` inside the left inset.