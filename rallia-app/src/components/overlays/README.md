# Overlays

This folder contains all overlay/modal components used throughout the Rallia app.

## Components

### Base Component
- **Overlay.tsx** - Reusable base overlay component with two types:
  - `bottom` - Slides up from bottom with slide animation
  - `center` - Appears in center with fade animation, supports `alignTop` for top-aligned overlays

### Onboarding Flow Overlays
These overlays are used during the user onboarding process:

1. **AuthOverlay.tsx** - Two-step authentication overlay
   - Step 1: Email entry with validation
   - Step 2: Code verification
   - Triggers calendar access overlay on code step

2. **LocationPermissionOverlay.tsx** - Dark themed permission request
   - Requests location access
   - Appears simultaneously with AuthOverlay

3. **CalendarAccessOverlay.tsx** - Calendar permission request
   - Appears when user reaches code verification step
   - Dark themed overlay from top

4. **PersonalInformationOverlay.tsx** - Profile information collection
   - Profile picture upload (camera/gallery with permissions)
   - Form fields: Full Name, Username, Date of Birth (with date picker), Gender, Phone Number
   - Platform-specific implementations (web vs mobile)

## Usage

Import overlays from the index file:

```typescript
import {
  AuthOverlay,
  LocationPermissionOverlay,
  CalendarAccessOverlay,
  PersonalInformationOverlay,
} from '../components/overlays';
```

Or import individually:

```typescript
import AuthOverlay from '../components/overlays/AuthOverlay';
```

## Overlay Flow

```
User clicks "Sign In"
  ↓
AuthOverlay (bottom) + LocationPermissionOverlay (top) appear simultaneously
  ↓
User enters email → Continue
  ↓
Code verification step + CalendarAccessOverlay (top) appears
  ↓
User enters code → Continue
  ↓
AuthOverlay closes
  ↓
PersonalInformationOverlay appears (bottom)
  ↓
User fills form → Continue
  ↓
Onboarding complete
```

## Notes

- All overlays are built on top of the base `Overlay` component
- Location and Calendar overlays can be dismissed independently
- Only AuthOverlay completion triggers PersonalInformationOverlay
- All overlays use proper animations and transitions (800ms delays between steps)
