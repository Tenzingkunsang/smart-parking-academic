# SmartPark Modern Design System

## Design Philosophy
Modern, professional SaaS-style design with clean typography, spacious layouts, and professional cards.

## Color Palette
- **Primary**: Cyan/Blue accent colors (from existing)
- **Background**: Dark (#050505, #0f172a)
- **Surfaces**: White/10% opacity for cards
- **Text**: White primary, Slate-400 secondary
- **Accents**: Gradient effects, subtle animations

## Key Components

### Typography
- **Headings**: font-display, bold, tracking-tight
- **Body**: font-sans, regular weight
- **Labels**: uppercase, tracking-widest, small font-size

### Cards
- Tailwind classes: `bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl`
- Hover state: subtle glow effect with `group` pattern
- Shadow: `shadow-2xl` or `shadow-lg`

### Buttons
- Primary: `bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl px-6 py-3`
- Secondary: `bg-white/10 border border-white/20 hover:bg-white/20 text-white`
- Danger: `bg-red-600 hover:bg-red-700 text-white`

### Spacing
- Container max-width: `max-w-7xl`
- Padding: consistent 6, 8, 12 values
- Gap between elements: space-y-6, gap-4

### Navigation
- Sticky navbar with scroll detection
- Glass morphism effect: `backdrop-blur-xl border border-white/10`
- Logo + Menu items + Auth section
- Mobile hamburger menu

### Cards Pattern (for stats, items)
```
┌─────────────────────────────┐
│  Icon/Title                 │
│                             │
│  Big Number/Primary Content │
│  Secondary Text             │
└─────────────────────────────┘
```

### Feature Cards
- Large heading with description
- Icon or image accent
- Multiple cards in grid layout
- Consistent padding and borders

## Implementation Order
1. Update Card.jsx component
2. Update Button.jsx component
3. Create new modern Navbar
4. Update Dashboard page
5. Update MyReservations page
6. Update ReservationPage
7. Update Payment/Ticket pages
8. Update Admin pages
9. Update Login/Register

## Tailwind Classes Reference
- Rounded: `rounded-xl`, `rounded-2xl`
- Backgrounds: `bg-slate-900`, `bg-white/5`, `bg-white/10`
- Borders: `border border-white/10`, `border border-white/20`
- Text: `text-white`, `text-slate-400`, `text-slate-500`
- Padding: `p-6`, `p-8`, `px-4 py-3`
- Gaps: `gap-3`, `gap-4`, `gap-6`
- Opacity: `opacity-50`, `opacity-100`
