---
name: Precision Engineering Dark Utility
colors:
  surface: '#10141a'
  surface-dim: '#10141a'
  surface-bright: '#353940'
  surface-container-lowest: '#0a0e14'
  surface-container-low: '#181c22'
  surface-container: '#1c2026'
  surface-container-high: '#262a31'
  surface-container-highest: '#31353c'
  on-surface: '#dfe2eb'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dfe2eb'
  inverse-on-surface: '#2d3137'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#ffb3ad'
  on-secondary: '#68000a'
  secondary-container: '#a40217'
  on-secondary-container: '#ffaea8'
  tertiary: '#ffb3af'
  on-tertiary: '#650911'
  tertiary-container: '#fc7c78'
  on-tertiary-container: '#711419'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#ffb3ad'
  on-secondary-fixed: '#410004'
  on-secondary-fixed-variant: '#930013'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3af'
  on-tertiary-fixed: '#410005'
  on-tertiary-fixed-variant: '#842225'
  background: '#10141a'
  on-background: '#dfe2eb'
  surface-variant: '#31353c'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Geist
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 1.25rem
    fontWeight: '500'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  title-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
  data-display:
    fontFamily: JetBrains Mono
    fontSize: 1.5rem
    fontWeight: '500'
    lineHeight: 1.75rem
    letterSpacing: -0.02em
  data-metric:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1rem
  label-xs:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1.5rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

The design system is engineered for power users, hardware enthusiasts, and creative professionals demanding absolute control over Windows desktop environments without visual clutter. It combines the rigorous diagnostic fidelity of Windows Sysinternals with the sleek, high-grade aesthetic of luxury hardware suites. 

The emotional tone is calm, surgical, authoritative, and non-destructive. Interactions prioritize clarity and glanceability: users immediately perceive system health, hardware thermals, memory loads, and optimization impact without aggressive marketing flair or gamified tropes.

Visual execution rests at the intersection of Windows 11 Fluent Design (Mica/Acrylic translucent layering, 1px micro-borders, refined geometry) and minimalist developer tools. Restraint is the core design tenet—vibrant hues are strictly bound to functional state communication rather than decorative styling.

## Colors

The palette operates entirely in a high-contrast dark space, using charcoal and deep slate tiers to create spatial hierarchy without ambient light leaks.

### Charcoal Surfaces & Canvas
- **Canvas Base:** `#0D1117` — The absolute foundation level of the application canvas.
- **Surface Layer 1 (Navigation/Sidebar):** `#161B22` — Deep structural anchor for primary split views and persistent sidebars.
- **Surface Layer 2 (Cards/Containers):** `#21262D` — Floating card surfaces and interactive panels.
- **Surface Layer 3 (Hover/Elevated Insets):** `#30363D` — Inset telemetry wells, active inputs, and elevated tooltips.

### Structural Lines
- **Subtle Zinc Borders:** `#30363D` at 1px thickness for razor-sharp panel delimitation.
- **Subtle Accent Keyline:** `rgba(240, 246, 252, 0.08)` for top specular highlights on glass cards.

### Semantic Accents
- **Emerald/Mint Safe Accent (`#10B981`):** Strictly reserved for safe, reversible actions, non-destructive cleaning, optimized processes, and healthy hardware thresholds (<70°C, normal voltage).
- **Coral/Crimson Critical Accent (`#EF4444`):** Strictly reserved for process termination warnings, extreme thermal alerts (>90°C), irreversible registry purges, and critical system faults.
- **Muted Amber Warning (`#F59E0B`):** Reserved exclusively for telemetry caution zones (e.g., thermal throttling thresholds between 80°C and 89°C).

### Typography Tones
- **Primary Text:** `#F0F6FC` — Crisp, high-readability off-white.
- **Secondary Text:** `#8B949E` — Slate-400 equivalent for labels, subtitles, and hardware descriptions.
- **Tertiary / Disabled Text:** `#484F58` — De-emphasized units, grid dividers, and inactive keys.

## Typography

The typographic hierarchy implements an engineering-first division between structural UI copy and telemetry instrumentation.

- **Geist** manages primary navigational headlines and sectional titles. Its geometric neutrality and tight kerning preserve modern luxury tech aesthetics.
- **Inter** executes all body copy, setting explanations, safety disclaimers, and interactive toggle descriptions. Its optical balancing guarantees total legibility at small sizes.
- **JetBrains Mono** is dedicated exclusively to telemetry data, memory addresses, clock speeds (GHz), thermal levels (°C), and tabular resource allocation lists. Numbers align cleanly in monospaced tabular tracks to prevent visual jittering during active background refreshes.

## Layout & Spacing

The application uses an adaptive desktop grid specifically calibrated for 16:9, 16:10, and ultrawide Windows desktop displays, scaling down fluidly to compact utility flyouts.

- **Primary Layout:** Split master-detail configuration. The global utility sidebar occupies a fixed 240px rail, while the operational dashboard runs on a 12-column fluid grid.
- **Grid Geometry:** 16px (`1rem`) gutters on standard displays, expanding to 24px (`1.5rem`) on ultra-high-resolution viewports (4K/QHD). Outer view canvas uses a mandatory 24px (`1.5rem`) safe margin away from window control titlebars.
- **Spatial Rhythm:** Built on an absolute 4px base step. Telemetry modules, hardware readouts, and process tables use dense micro-spacings (`space-xs` to `space-md`) to ensure critical diagnostics remain above the fold. General administrative settings and cards adopt relaxed paddings (`space-lg` to `space-xl`).

## Elevation & Depth

Visual hierarchy uses physical depth cues informed by Windows 11 Acrylic and dark-mode glassmorphism, completely omitting heavy, smudgy drop shadows in favor of precise translucent planes and crisp edge-lit borders.

1. **Window Canvas (`#0D1117`):** Non-elevated bedrock. Pure opacity.
2. **Glassmorphic Paneling:** Surfaces floating on Layer 2 use `rgba(33, 38, 45, 0.75)` combined with a `backdrop-filter: blur(16px) saturate(140%)`. This allows subtle desktop wallpapers or background motion to hint through without degrading visual text contrast.
3. **1px Micro-Outlines:** Cards and overlay dialogs rely on a 1px uniform perimeter border of `#30363D`. On interactive cards, a dual-layer technique applies: a 1px border of `rgba(240, 246, 252, 0.08)` along the top edge functions as an architectural specular light reflection, grounding the surface in 3D space.
4. **Tooltips & Popovers:** Suspended at the top elevation tier using `#161B22` with a discrete shadow: `0 8px 24px -4px rgba(0, 0, 0, 0.65)`, rimmed with a 1px `#30363D` border.

## Shapes

The design system implements a refined, surgical corner language using Level 1 (Soft) geometry. This maintains alignment with the modern Windows 11 Shell while projecting industrial precision rather than mobile-centric playfulness.

- **Standard Elements (Buttons, Inputs, Badges, Chips):** `0.25rem` (4px). Clean, technical, and space-efficient.
- **Containers & Glass Cards:** `0.5rem` (8px). Matches the native Windows 11 desktop window and container curvature.
- **Modals & Flyout Sheets:** `0.75rem` (12px).
- **Proportional Geometry:** Concentric radius nesting is strictly preserved: internal inset tracks (e.g., telemetry bar charts or memory fill meters) use a 2px radius within a 4px perimeter container to ensure geometric balance.

## Components

### Buttons
- **Primary / Actionable (`#10B981`):** Emerald background with dark charcoal (`#06281E`) high-contrast text. Dedicated solely to committing safe optimizations (e.g., "Optimize Working Set", "Trim Memory").
- **Critical / Destructive (`#EF4444`):** Coral background with crisp white text. Used only for dangerous operations (e.g., "End Process Tree", "Flush Registry Keys").
- **Secondary / Ghost:** Transparent surface with 1px border in `#30363D`, text in `#F0F6FC`. On hover, background shifts to `rgba(240, 246, 252, 0.04)` with border lightening to `rgba(240, 246, 252, 0.2)`.

### Hardware Telemetry Chips
- Compact, monospaced pills embedded into card headers and data arrays.
- Consist of a `space-xs` (2px) leading indicator dot (pulsing emerald for steady state, amber for warning, coral for high-load), followed by an uppercase parameter tag in `label-xs` and a monospaced metric reading in `data-metric`.
- Background: `rgba(22, 27, 34, 0.8)` with a 1px `#30363D` stroke.

### Input Fields & Controls
- Background fills utilize `#161B22` with a static 1px border `#30363D`. Active focus states replace the border with a 1px `#10B981` stroke accompanied by a subtle `0 0 0 1px #10B981` ring; critical filter inputs invoke `#EF4444` instead.
- Text adheres to `JetBrains Mono` for algorithmic parameter inputs, hex masks, and thread IDs.

### Checkboxes & Segmented Toggles
- Checkboxes are 16x16px boxes with a 2px corner radius. Unchecked: `#161B22` fill with `#30363D` border. Checked: `#10B981` fill with an inset deep charcoal tick icon.
- Toggles feature a recessed channel (`#161B22`) with a smooth sliding thumb (`#8B949E` when disabled, `#10B981` when active).

### Lists & Process Diagnostics
- Dense tabular rows with an alternating row accent (`rgba(255, 255, 255, 0.015)`).
- 32px standard row height. Visual columns segment PID, thread count, memory footprint, CPU consumption, and I/O status using aligned right-hand figures in `JetBrains Mono`. Hovering on any row transitions background to `#21262D` across a 100ms ease curve.

### Translucent Frosted Glass Cards
- Built with `#21262D` at 75% opacity, layered over a 16px backdrop blur. 
- Headers feature a subtle hairline border separator (`#30363D`) and include dedicated real-time hardware sparklines (SVG graphs with an emerald single-pixel gradient stroke).