# Shared Components Package

Reusable UI components for Rallia mobile and web apps.

## Usage

```typescript
import { Overlay, MatchCard, AppHeader } from '@rallia/shared-components';
import { LocationPermissionOverlay, CalendarAccessOverlay } from '@rallia/shared-components';
```

## Components

- **Overlay**: Base overlay component with animations
- **MatchCard**: Display match information
- **AppHeader**: Navigation header with logo (pass as prop)
- **PermissionOverlay**: Generic permission request UI
- **LocationPermissionOverlay**: Location-specific permission
- **CalendarAccessOverlay**: Calendar-specific permission

## Platform-Specific Files

All components use `.native.tsx` extension for React Native.
When adding web support, create `.web.tsx` variants.
