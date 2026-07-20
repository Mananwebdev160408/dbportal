# Visual Design System (DESIGN.md)

## Theme & Palette (OKLCH Native)

- **Mode**: Dark Mode exclusively (Terminal Native / Raycast & Warp aesthetic)
- **Base Background**: `#080a11` (`oklch(0.08 0 0)` - Pitch Obsidian)
- **Surface Panels**: `#0e121e` (`oklch(0.12 0.01 250)`)
- **Surface Hover**: `#141a2b` (`oklch(0.15 0.015 250)`)
- **Structural Borders**: `1px solid #1e2638` (`oklch(0.18 0.02 250)`)
- **High-Contrast Text**: `#f8fafc` (Slate 50)
- **Muted Text**: `#94a3b8` (Slate 400 - contrast ratio ≥ 5.2:1)
- **Primary Accent**: `#a3e635` (`oklch(0.85 0.21 145)` - Electric Lime)
- **Cyan Highlight**: `#38bdf8` (`oklch(0.78 0.18 195)` - Cyber Cyan)
- **Violet Accent**: `#818cf8` (`oklch(0.60 0.20 280)` - Deep Violet)

## Typography

- **Headings**: Inter / Space Grotesk (`clamp(2.5rem, 5vw, 4rem)`, Letter-spacing: `-0.03em`)
- **Code & Metadata**: 'JetBrains Mono', monospace
- **Body**: Inter (`1rem`, Line-height: `1.65`, Max-width: `72ch`)

## Navigation (Tactile Bottom Command Dock)

- **Container**: Floating capsule at `bottom: 1.5rem`, pitch dark `#0d111c` with `1px solid #2a344a` border and shadow `0 20px 50px rgba(0,0,0,0.8)`
- **Keybinding Badges**: Visible mono shortcut keys `[1]`, `[2]`, `[3]`, `[4]`, `[5]`, `[6]`
- **Active State**: Lime glow indicator line & crisp highlight box

## Anti-AI Rules

- Use premium "sharded glass" panels & cards (using layered linear-gradients for angled reflections/facets & high blur backdrop-filter: blur(16px-24px)) to integrate components beautifully with the background glows.
- NO plain/flat solid background panels for components (ensure sub-containers and overlays are semi-transparent rgba to allow the backdrop blur to shine through).
- NO gradient text clips.
- NO side-stripe colored card borders.
- NO generic rounded 32px template cards (strict 12px panel radii).
