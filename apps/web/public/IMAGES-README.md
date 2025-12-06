# Required Images for Rallia Landing Page

This document outlines the images you need to create for the landing page to be complete.

## Critical Images

### 1. Favicon Set

Create favicons in the following sizes:

- `favicon.ico` - 16x16 and 32x32 (multi-size ICO file)
- `favicon-16x16.png` - 16x16 PNG
- `apple-touch-icon.png` - 180x180 PNG for iOS

**Current Status**: Using a temporary SVG favicon placeholder.

**Design Requirements**:

- Use the Rallia green color (#97d034)
- Feature the "R" letter or a tennis/pickleball icon
- Should be simple and recognizable at small sizes

### 2. Open Graph Image

- **File**: `og-image.png`
- **Size**: 1200x630 pixels
- **Format**: PNG or JPG

**Design Requirements**:

- Include the Rallia logo/wordmark
- Headline: "Where Rallies Live On"
- Subtext: "Coming Early 2026"
- Use brand colors (green #97d034)
- Include tennis/pickleball imagery
- Should look good when shared on social media (Twitter, Facebook, LinkedIn)

## Design Tools Recommendations

1. **Favicon Generator**: Use https://realfavicongenerator.net/ to generate all favicon sizes from a single design
2. **OG Image**: Use Figma, Canva, or Photoshop
3. **Quick Tools**:
   - https://www.canva.com/ (templates available)
   - https://www.figma.com/ (design from scratch)

## Brand Colors

- Primary Green: `#97d034`
- Dark Green: `#75a02b`
- Light Green: `#f7ffeb`

## Current Setup

The layout.tsx file is already configured to use these images:

- Open Graph image at `/og-image.png`
- Favicon at `/favicon.ico`
- Small favicon at `/favicon-16x16.png`
- Apple touch icon at `/apple-touch-icon.png`

Once you create these images, simply place them in the `/public` directory and they will be automatically served.
