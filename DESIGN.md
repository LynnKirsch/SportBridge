---
name: SportBridge
description: Editorial sports interface for a manager-verified purchasing service.
colors:
  action-violet: "#4F56D3"
  signal-mint: "#67E8C4"
  workshop-blue: "#E1E9F0"
  inspection-navy: "#0E193A"
  paper-surface: "#F4F5F6"
  rule-grey: "#BDC7CD"
  status-success: "#349A2A"
  status-error: "#D43C36"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "Druk Cyr Bold, Impact, sans-serif"
    fontSize: "clamp(2.9rem, 7.1vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0.08em"
rounded:
  small: "12px"
  control: "16px"
  large: "24px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "24px"
  6: "32px"
  7: "48px"
  8: "64px"
  9: "96px"
  10: "128px"
components:
  button-primary:
    backgroundColor: "{colors.action-violet}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "20px 24px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.inspection-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "13px 20px"
  input-url:
    backgroundColor: "{colors.white}"
    textColor: "{colors.inspection-navy}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "24px 32px"
---

# Design System: SportBridge

## Overview

**Creative North Star: "The Inspection Line"**

SportBridge combines editorial sports typography with the precision of a product inspection sheet. The interface feels like a calm premium workshop where a customer hands over one concrete item for expert verification, not like a generic SaaS dashboard or an online catalogue.

The inspection line is expressed through a strong URL workpiece inside a measured twelve-column field. Thin rules, generous spacing, restrained labels and flat surfaces establish technical credibility; oversized condensed headlines carry sporting energy.

**Key Characteristics:**

- One decisive action in the first viewport.
- Large condensed statements paired with calm, readable UI copy.
- Strict grid, airy spacing and thin rules instead of nested cards.
- One action accent plus a small mint signal.
- Explicit manager verification rather than automated-price claims.

## Colors

The palette is cool, quiet and technical, with violet reserved for action and mint used as a small signal.

### Primary

- **Action Violet:** The only non-semantic action color, used on primary controls and focus states.

### Secondary

- **Signal Mint:** A compact orientation and focus signal; never a large decorative surface.

### Neutral

- **Workshop Blue:** The page field that gives the interface its cool workshop atmosphere.
- **Inspection Navy:** The text, high-contrast rule and icon color; it replaces black.
- **Paper Surface:** A raised-by-tone section surface without shadow.
- **Rule Grey:** Quiet dividers and secondary boundaries.
- **White:** Input and high-clarity control surfaces.
- **Status Success / Status Error:** Reserved exclusively for semantic feedback.

### Named Rules

**The One Accent Rule.** Action Violet carries interaction; Signal Mint only punctuates orientation and focus.

**The Semantic Status Rule.** Success and error colors never decorate neutral content.

## Typography

**Display Font:** Druk Cyr Bold (with Impact and sans-serif fallbacks)
**Body Font:** Manrope (with Arial and sans-serif fallbacks)
**Label Font:** Manrope

**Character:** Druk provides compressed athletic force for short statements. Manrope keeps instructions and controls measured, contemporary and easy to scan.

### Hierarchy

- **Display** (700, responsive 2.9rem–6rem, 0.9 line-height): H1/H2 and short high-impact statements only.
- **Body** (400, 1rem, 1.5 line-height): explanatory content with a target measure near 65–75 characters.
- **UI** (500–600): input copy, navigation and supporting controls.
- **Label** (700, 0.75rem, 0.08em tracking, uppercase): process markers and technical descriptors.

### Named Rules

**The Split Voice Rule.** Druk makes the promise; Manrope explains the process and operates the interface.

## Layout

The layout uses twelve equal columns. Column gaps are 16px on compact screens and 24px from 960px. Page gutters are 15px below 480px, 30px from 480px, 50px from 1440px, 90px from 1920px and 120px from 2560px. Components align to this outer grid rather than creating competing page gutters. The spacing rhythm follows the 4/8-derived scale in the frontmatter.

## Elevation & Depth

The system is flat by default and uses no shadows. Hierarchy comes from tonal surface changes, borders, scale and whitespace.

### Named Rules

**The Flat Workshop Rule.** Surfaces separate through tone and one-pixel rules, never decorative elevation.

## Shapes

Controls use 12–16px corners, larger containers use 24px, and compact secondary actions may use the 999px pill. Borders are consistently one pixel. Circular geometry is limited to small signals such as the mint brand dot.

## Components

### Buttons

- **Shape:** Confident compact controls with 12px primary corners or a 999px secondary pill.
- **Primary:** Action Violet with white Manrope 700 text; on mobile the submit label becomes a clear directional arrow.
- **Hover / Focus / Active:** Hover darkens without layout shift, focus is a visible three-pixel ring, and active movement is limited to one pixel.
- **Secondary:** Transparent, navy outlined and deliberately quieter than the primary action.

### Inputs / Fields

- **Style:** White field, navy one-pixel boundary and 16px outer corners; the URL field is treated as the central workpiece.
- **Hover / Focus:** Boundary shifts to Action Violet; focus adds a visible violet ring without changing dimensions.
- **Copy:** Manrope 500 with a readable muted-navy placeholder.

### Navigation

The wordmark is plain navy Manrope with one mint signal dot. Supporting navigation uses compact uppercase labels and remains secondary to the task.

### Process Rail

A thin horizontal rule connects three uppercase labels—link, inspection and manager calculation—without implying automatic completion.

## Do's and Don'ts

### Do:

- **Do** build hierarchy with type scale, measured whitespace and one-pixel rules.
- **Do** keep each viewport focused on one primary action.
- **Do** state where a manager verifies availability, parameters and price.
- **Do** preserve visible focus and reduced-motion behavior.

### Don't:

- **Don't** use gradients, acid yellow, black in place of navy, or decorative success/error colors.
- **Don't** introduce generic SaaS card grids, glass effects or excessive shadows.
- **Don't** use Druk for paragraphs, form instructions or dense UI.
- **Don't** imply an automatically confirmed price when manager review is required.
