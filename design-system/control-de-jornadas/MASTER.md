# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Control de jornadas
**Generated:** 2026-09-05 15:45:37
**Category:** Productivity Tool
**Design Dials:** Variance 3/10 (Centered / Minimal) | Motion 3/10 (Subtle) | Density 4/10 (Standard)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#A56B74` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#C4A49A` | `--color-secondary` |
| On Secondary | `#3F3335` | `--color-on-secondary` |
| Accent/CTA | `#A56B74` | `--color-accent` |
| On Accent/CTA | `#FFFFFF` | `--color-on-accent` |
| Background | `#F7F3F1` | `--color-background` |
| Foreground | `#3F3335` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#3F3335` | `--color-card-foreground` |
| Muted | `#F3E8E6` | `--color-muted` |
| Muted Foreground | `#6B5C5F` | `--color-muted-foreground` |
| Border | `#E8D8D6` | `--color-border` |
| Destructive | `#B3261E` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#A56B74` | `--color-ring` |

**Color Notes:** Paleta adaptada para una usuaria: rosa polvo y crema cálida. Sin rosa chillón, corazones ni decoración extra. El sistema automático sugería teal; se suavizó a pedido.

### Typography

- **Heading Font:** Plus Jakarta Sans
- **Body Font:** Plus Jakarta Sans
- **Mood:** friendly, modern, saas, clean, approachable, professional
- **Google Fonts:** [Plus Jakarta Sans + Plus Jakarta Sans](https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
```

### Spacing Variables

*Density: 4/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #A56B74;
  color: white;
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.94;
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #A56B74;
  border: 1px solid #E8D8D6;
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
  border: 1px solid #E8D8D6;
  transition: all 200ms ease;
}
```

### Mobile notes

- Bottom nav with max 4 items
- Touch targets >= 48px
- Soft feminine palette without loud pink
- Per-worker history

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E8D8D6;
  border-radius: 14px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #A56B74;
  outline: none;
  box-shadow: 0 0 0 3px rgba(165, 107, 116, 0.18);
}
```

---

## Style Guidelines

**Style:** Soft feminine utility (dusty rose + cream)

**Keywords:** Warm, calm, mobile-first, clear hierarchy, tactile cards, soft shadows

**Best For:** Small-team time tracking, settlement tools, daily admin on phone

**Key Effects:** Page enter fade (220ms), button press scale, sticky blur chrome, soft card elevation

### Page Pattern

**Pattern Name:** Mobile utility shell

- Bottom navigation for primary tasks
- One job per screen
- History scoped per worker
- Large money/time totals as primary signals

---

## Motion

**Page enter** (Subtle) — Duration: 220ms | Easing: ease-out

```css
.page-enter {
  animation: page-enter 220ms ease-out;
}
@keyframes page-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .page-enter { animation: none; }
}
```

---

## Anti-Patterns (Do NOT Use)

- ❌ Complex onboarding
- ❌ Slow performance

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
