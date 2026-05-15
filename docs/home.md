---
name: Modern Minimalist HRIS
colors:
  surface: '#fbf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#f0eded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#454652'
  inverse-surface: '#303030'
  inverse-on-surface: '#f2f0f0'
  outline: '#767683'
  outline-variant: '#c6c5d4'
  surface-tint: '#4c56af'
  primary: '#000666'
  on-primary: '#ffffff'
  primary-container: '#1a237e'
  on-primary-container: '#8690ee'
  inverse-primary: '#bdc2ff'
  secondary: '#556158'
  on-secondary: '#ffffff'
  secondary-container: '#d9e6da'
  on-secondary-container: '#5b675e'
  tertiary: '#380b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#5c1800'
  on-tertiary-container: '#e17c5a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#000767'
  on-primary-fixed-variant: '#343d96'
  secondary-fixed: '#d9e6da'
  secondary-fixed-dim: '#bdcabe'
  on-secondary-fixed: '#131e17'
  on-secondary-fixed-variant: '#3e4a41'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#7b2e12'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-page: 1.25rem
  gutter-card: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 1.5rem
---

## Brand & Style

This design system is built to balance the authoritative nature of Human Resources with a refreshing, accessible mobile experience. The brand personality is **Professional yet Empathetic**, aiming to reduce the cognitive load of administrative tasks through a clean, modern interface.

The visual style is a sophisticated blend of **Modern Minimalism** and **Glassmorphism**. While the layout remains structured and functional, the use of translucent layers and background blurs adds a sense of depth and lightness, preventing the interface from feeling "heavy" or overly corporate. The goal is to evoke a sense of clarity, trust, and effortless efficiency.

## Colors

The palette is anchored by a **Deep Navy Primary (#1A237E)**, providing a foundation of stability and institutional trust. Functional colors use a softer, pastel-leaning approach to maintain the minimalist aesthetic:

- **Primary:** Used for key headers, active navigation states, and primary actions.
- **Success:** A soft mint green used for positive status indicators (e.g., approved leave).
- **Danger:** A muted red for alerts, late clock-ins, or declined requests.
- **Background:** A very light cool gray (#F5F5F7) that provides enough contrast for white cards and glass elements to pop.
- **Neutral:** Mid-to-dark grays used exclusively for body text and icon outlines to maintain high legibility.

## Typography

This design system utilizes a dual-font strategy to optimize for both character and utility. 

**Manrope** is used for headlines to provide a modern, refined, and geometric feel. Large headers are intentionally set to extra-bold with tight letter spacing to create a strong visual hierarchy. 

**Inter** is used for all body text and UI labels. Its neutral, systematic design ensures maximum legibility for dense HR data, such as payslip details or policy documents. High contrast is maintained by using the Primary Deep Blue for headers and a dark neutral for body copy.

## Layout & Spacing

The layout follows a **Fluid Mobile Grid** optimized for ergonomics. We utilize a 4-column grid for mobile with 20px (1.25rem) side margins to ensure touch targets are kept away from the screen edges.

Spacing follows an 8px base unit. Component internal padding should be generous to promote the minimalist aesthetic. Card-based layouts should utilize a vertical stacking rhythm of 16px (1rem) to maintain a clean flow. For action grids (e.g., dashboard shortcuts), use a 2xN grid with 12px gutters.

## Elevation & Depth

Visual hierarchy is established through **Ambient Shadows** and **Glassmorphism**. 

1.  **Base Layer:** The light gray background.
2.  **Surface Layer:** Pure white cards with a very soft, diffused shadow (Blur: 20px, Opacity: 4%, Y: 4).
3.  **Accent Layer (Glass):** Floating headers or specific "Quick Action" cards use a background blur (15px to 25px) with a semi-transparent white fill (80% opacity). A subtle 1px white inner-border is used to define glass edges.
4.  **Action Layer:** Circular buttons use a slightly deeper shadow to signify interactability and "float" above the surface layers.

## Shapes

The shape language is consistently **Rounded**. Standard cards and input fields use a 16px (1rem) corner radius to feel approachable. Small elements like chips or badges use a 8px radius. 

**Circular geometry** is reserved for primary action triggers (Floating Action Buttons) and profile avatars, creating a distinct visual contrast against the rectangular card-based layout.

## Components

-   **Cards:** The primary container. Cards should have no borders, relying instead on soft shadows or glass effects. Content within cards should be padded at 20px.
-   **Circular Action Buttons:** Floating or primary buttons must be perfectly circular. Use the Primary Deep Blue with a white icon.
-   **Icon Grid:** Used for dashboard navigation. Icons should be housed in soft-colored circles (using 10% opacity of the primary or success colors) to keep the UI light.
-   **Bottom Navigation:** A glassmorphic bar with a background blur. Active states are indicated by the Primary Deep Blue, while inactive states use a medium neutral gray.
-   **Input Fields:** Ghost-style inputs with a light gray fill and a 16px radius. On focus, the border transitions to the Primary Deep Blue.
-   **Chips/Status Badges:** Pill-shaped with a low-opacity background of the status color (Success/Danger) and high-saturation text for readability.
-   **Lists:** Clean, borderless list items separated by whitespace or a very faint 0.5px hair-line divider.