# @rallia/design-system

Unified design system for Rallia - providing consistent design tokens across web (Tailwind CSS v4) and mobile (NativeWind) platforms.

## Installation

```bash
npm install @rallia/design-system
```

## Features

- **Colors**: Complete color palette with primary (teal), secondary (coral), and accent (gold) scales
- **Typography**: Font families, sizes, weights, line heights, and letter spacing
- **Spacing**: Consistent spacing scale based on 4px units
- **Shadows**: Light and dark mode shadow tokens
- **Animations**: Duration, easing, and delay tokens
- **Themes**: Light and dark theme configurations
- **Platform Support**: Works with both web (Tailwind) and mobile (NativeWind)

## Usage

### Import Tokens

```typescript
import {
  primary,
  secondary,
  accent,
  spacing,
  shadows,
  duration,
} from '@rallia/design-system';

// Use color values
const backgroundColor = primary[500]; // '#14b8a6'

// Use spacing
const padding = spacing[4]; // '1rem'
```

### Import Themes

```typescript
import { lightTheme, darkTheme, getTheme } from '@rallia/design-system';

// Get theme based on mode
const theme = getTheme('dark');
console.log(theme.background); // Dark mode background color
```

### Web (Tailwind CSS v4)

The design system integrates with Tailwind CSS v4's CSS-based configuration:

```typescript
// tailwind.config.ts (if needed for customization)
import { tailwindPreset } from '@rallia/design-system/config/tailwind';

export default {
  presets: [tailwindPreset],
  // ... other config
};
```

Or generate CSS variables for your `globals.css`:

```typescript
import { generateDesignSystemCSS } from '@rallia/design-system';

// Generate CSS custom properties
const css = generateDesignSystemCSS();
```

### Mobile (NativeWind)

Configure NativeWind with the design system:

```javascript
// tailwind.config.js
const { nativewindConfig } = require('@rallia/design-system/config/nativewind');

module.exports = {
  ...nativewindConfig,
  // ... your customizations
};
```

Generate the global CSS for NativeWind:

```typescript
import { generateNativewindGlobalCSS } from '@rallia/design-system/config/nativewind';

const css = generateNativewindGlobalCSS();
// Include this CSS in your app
```

### Utilities

```typescript
import {
  hexToRgba,
  lighten,
  darken,
  getContrastRatio,
  cssVar,
} from '@rallia/design-system';

// Color manipulation
const transparent = hexToRgba('#14b8a6', 0.5);
const lighter = lighten('#14b8a6', 20);
const darker = darken('#14b8a6', 20);

// Accessibility
const ratio = getContrastRatio('#ffffff', '#14b8a6');

// CSS variable helpers
const bgColor = cssVar('primary-500'); // 'var(--primary-500)'
```

## Token Reference

### Colors

| Scale     | Description         | Base Color |
| --------- | ------------------- | ---------- |
| primary   | Teal/Cyan           | #14b8a6    |
| secondary | Red/Coral           | #ed6a6d    |
| accent    | Yellow/Gold         | #f59e0b    |
| neutral   | Grayscale           | #737373    |

Each color has shades from 50 to 950.

### Typography

- **Heading Font**: Poppins
- **Body Font**: Inter
- **Sizes**: xs (12px) to 9xl (128px)
- **Weights**: normal (400) to extrabold (800)

### Spacing

Based on 4px units: 0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64, 80, 96

### Shadows

- none, sm, DEFAULT, md, lg, xl, 2xl
- Native shadow configurations included

### Animations

- **Durations**: instant to extraSlow (0ms to 1000ms)
- **Easings**: linear, ease, easeIn, easeOut, spring, bounce
- **Keyframes**: fadeIn, fadeOut, pulse, shimmer, spin

## Migration from shared-constants

The design system includes legacy compatibility exports:

```typescript
// These are deprecated but available for migration
import { COLORS, ANIMATION_DELAYS, ANIMATION_DURATIONS } from '@rallia/design-system';
```

Migrate to the new exports:

```typescript
// Before
import { COLORS } from '@rallia/shared-constants';
const bg = COLORS.primary;

// After
import { primary } from '@rallia/design-system';
const bg = primary[500];
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  ColorShade,
  FontSize,
  SpacingKey,
  ThemeMode,
  Elevation,
} from '@rallia/design-system';
```

## License

UNLICENSED


