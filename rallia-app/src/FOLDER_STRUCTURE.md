# Rallia Tennis App - Folder Structure Documentation

> **Last Updated:** November 20, 2025  
> **App Type:** React Native (Expo) - Tennis/Sports Matching Platform  
> **Architecture:** Feature-based with shared resources

---

## 📁 Root Structure

```
rallia-app/
├── src/                    # Source code (all application logic)
├── assets/                 # Static assets (images, icons, fonts)
├── docs/                   # Documentation and specifications
├── .expo/                  # Expo configuration (auto-generated)
├── node_modules/           # Dependencies (auto-generated)
├── App.tsx                 # Application entry point
├── app.json                # Expo app configuration
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── .env                    # Environment variables
```

---

## 🎯 /src Directory Structure

### Overview
The `src/` directory follows a **hybrid architecture**:
- **Feature-based** for domain-specific logic (matches, profile, chat)
- **Shared resources** for reusable code (components, hooks, utils)

```
src/
├── components/             # Shared UI components
├── constants/              # App-wide constants (colors, animations, config)
├── context/                # React Context providers (global state)
├── data/                   # Mock data and data models
├── features/               # Feature modules (domain-specific)
├── hooks/                  # Custom React hooks
├── lib/                    # Third-party library configurations
├── navigation/             # Navigation configuration
├── screens/                # Screen components (main views)
├── services/               # API calls and external services
├── styles/                 # Shared styles and themes
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions and helpers
```

---

## 📦 Detailed Folder Descriptions

### `/components` - Shared UI Components
**Purpose:** Reusable UI components used across multiple features

```
components/
├── overlays/               # Modal overlays (auth, permissions, etc.)
│   ├── AuthOverlay.tsx
│   ├── LocationPermissionOverlay.tsx
│   ├── PersonalInformationOverlay.tsx
│   ├── SportSelectionOverlay.tsx
│   ├── Overlay.tsx         # Base overlay component
│   ├── index.ts            # Barrel export
│   └── README.md           # Overlay system documentation
├── AppHeader.tsx           # App-wide header component
├── MatchCard.tsx           # Match display card
└── [future components]     # Buttons, inputs, loaders, etc.
```

**When to add here:**
- Component is used in 2+ features
- Component is pure UI (no business logic)
- Examples: Buttons, Cards, Inputs, Avatars, Badges

---

### `/constants` - App-wide Constants
**Purpose:** Centralized configuration values

```
constants/
├── animations.ts           # Animation timing (delays, durations)
├── colors.ts               # Color palette (primary, accent, status)
├── config.ts               # [FUTURE] App configuration
├── routes.ts               # [FUTURE] Route names
└── index.ts                # Barrel export
```

**What belongs here:**
- Colors, fonts, spacing values
- API endpoints base URLs
- Feature flags
- Animation timings
- App-wide configuration

---

### `/context` - Global State Management
**Purpose:** React Context providers for app-wide state

```
context/
├── AuthContext.tsx         # [FUTURE] Authentication state
├── UserContext.tsx         # [FUTURE] Current user data
├── MatchContext.tsx        # [FUTURE] Match filtering/search state
├── NotificationContext.tsx # [FUTURE] Notifications
└── index.ts                # Barrel export
```

**When to use:**
- State needed across multiple features
- User authentication state
- App-wide preferences
- Real-time data (notifications, messages)

**⚠️ Note:** Currently using Supabase auth. Consider Zustand or Redux for complex state.

---

### `/data` - Data Layer
**Purpose:** Mock data, data transformations, and data models

```
data/
├── mockMatches.ts          # Mock match data (current)
├── mockUsers.ts            # [FUTURE] Mock user profiles
├── mockMessages.ts         # [FUTURE] Mock chat messages
├── schemas/                # [FUTURE] Data validation schemas
│   ├── matchSchema.ts
│   └── userSchema.ts
└── transformers/           # [FUTURE] Data transformation utilities
    └── matchTransformer.ts
```

**What belongs here:**
- Mock/test data during development
- Data transformation functions
- Data validation schemas (Zod, Yup)
- Data normalization utilities

---

### `/features` - Feature Modules
**Purpose:** Domain-specific code organized by feature

```
features/
├── onboarding/             # User onboarding flow
│   ├── components/         # Feature-specific components
│   ├── hooks/              # Feature-specific hooks
│   ├── screens/            # Onboarding screens
│   ├── types.ts            # Feature types
│   └── README.md           # Feature documentation
│
├── matches/                # Match creation, browsing, joining
│   ├── components/
│   │   ├── MatchCreationForm.tsx
│   │   ├── MatchFilters.tsx
│   │   └── MatchDetailCard.tsx
│   ├── hooks/
│   │   ├── useMatchSearch.ts
│   │   └── useMatchCreation.ts
│   ├── screens/
│   │   ├── MatchBrowse.tsx
│   │   ├── MatchCreate.tsx
│   │   └── MatchDetails.tsx
│   ├── services/
│   │   └── matchService.ts
│   └── types.ts
│
├── profile/                # User profiles
│   ├── components/
│   │   ├── ProfileHeader.tsx
│   │   ├── StatsCard.tsx
│   │   └── MatchHistory.tsx
│   ├── screens/
│   │   ├── UserProfile.tsx
│   │   └── EditProfile.tsx
│   ├── services/
│   │   └── profileService.ts
│   └── types.ts
│
├── chat/                   # Messaging system
│   ├── components/
│   │   ├── ChatBubble.tsx
│   │   ├── MessageInput.tsx
│   │   └── ChatHeader.tsx
│   ├── screens/
│   │   ├── ChatList.tsx
│   │   └── ChatRoom.tsx
│   ├── services/
│   │   └── chatService.ts
│   └── types.ts
│
├── community/              # Community features
│   ├── components/
│   │   ├── CommunityPost.tsx
│   │   └── CommunityFeed.tsx
│   ├── screens/
│   │   └── Community.tsx
│   └── types.ts
│
└── map/                    # Map and location features
    ├── components/
    │   ├── CourtMarker.tsx
    │   └── MapFilters.tsx
    ├── screens/
    │   └── Map.tsx
    └── types.ts
```

**Feature Module Pattern:**
Each feature folder can contain:
- `components/` - Components used only in this feature
- `hooks/` - Custom hooks for this feature
- `screens/` - Screen components
- `services/` - API calls specific to this feature
- `types.ts` - TypeScript types for this feature
- `utils.ts` - Helper functions for this feature
- `constants.ts` - Feature-specific constants
- `README.md` - Feature documentation

**When to create a new feature:**
- New major functionality area
- Code that belongs together logically
- At least 2-3 related screens

---

### `/hooks` - Custom React Hooks
**Purpose:** Reusable React hooks used across features

```
hooks/
├── useAuth.ts              # Authentication logic
├── useOnboardingFlow.ts    # Onboarding flow management
├── useImagePicker.ts       # Image picker functionality
├── useDebounce.ts          # [FUTURE] Debounce utility
├── useGeolocation.ts       # [FUTURE] Location tracking
└── index.ts                # Barrel export
```

**What belongs here:**
- Hooks used in 2+ features
- Reusable stateful logic
- Hooks wrapping external libraries
- Examples: useForm, useDebounce, useGeolocation

---

### `/lib` - Third-party Library Configurations
**Purpose:** Configuration and setup for external libraries

```
lib/
├── supabase.ts             # Supabase client configuration (current)
├── analytics.ts            # [FUTURE] Analytics setup
├── crashlytics.ts          # [FUTURE] Crash reporting
├── maps.ts                 # [FUTURE] Map provider config
└── notifications.ts        # [FUTURE] Push notifications
```

**What belongs here:**
- Library initialization code
- SDK configurations
- API client setup
- Examples: Supabase, Firebase, Stripe, Maps

---

### `/navigation` - Navigation Configuration
**Purpose:** React Navigation setup

```
navigation/
├── AppNavigator.tsx        # Root navigator (current)
├── AuthStack.tsx           # [FUTURE] Authentication flow
├── MainStack.tsx           # [FUTURE] Main app flow
├── TabNavigator.tsx        # [FUTURE] Bottom tabs
├── types.ts                # [FUTURE] Navigation types
└── linking.ts              # [FUTURE] Deep linking config
```

**Best Practice:**
- Split large navigators into smaller files
- Use TypeScript for type-safe navigation
- Keep navigation logic separate from screens

---

### `/screens` - Screen Components
**Purpose:** Top-level screen components

```
screens/
├── Landing.tsx             # Landing/splash screen
├── Home.tsx                # Home screen (current)
├── Map.tsx                 # Map view
├── Community.tsx           # Community feed
├── Profile.tsx             # User profile
├── Match.tsx               # Match details
└── Chat.tsx                # Chat screen
```

**⚠️ Migration Strategy:**
As features grow, move screens to `/features`:
```
screens/Home.tsx → features/matches/screens/MatchBrowse.tsx
screens/Profile.tsx → features/profile/screens/UserProfile.tsx
```

Keep `/screens` for:
- Main navigation screens
- Screens used across features
- Small, simple screens

---

### `/services` - API and External Services
**Purpose:** API calls and external service integrations

```
services/
├── api/                    # API client setup
│   ├── client.ts           # Axios/Fetch client
│   └── endpoints.ts        # API endpoint definitions
├── auth/                   # Authentication service
│   ├── authService.ts
│   └── tokenStorage.ts
├── matches/                # Match API calls
│   └── matchService.ts
├── users/                  # User API calls
│   └── userService.ts
├── chat/                   # Chat/messaging service
│   └── chatService.ts
├── location/               # Location services
│   └── locationService.ts
└── notifications/          # Push notifications
    └── notificationService.ts
```

**What belongs here:**
- API request functions
- External service integrations
- Data fetching logic
- WebSocket connections
- File upload/download

**Pattern Example:**
```typescript
// services/matches/matchService.ts
export const matchService = {
  async getMatches() { /* ... */ },
  async createMatch() { /* ... */ },
  async joinMatch() { /* ... */ },
};
```

---

### `/styles` - Shared Styles
**Purpose:** Reusable styles and theme definitions

```
styles/
├── commonStyles.ts         # Common button, input, container styles
├── theme.ts                # [FUTURE] Theme configuration
├── typography.ts           # [FUTURE] Text styles
└── index.ts                # Barrel export
```

**What belongs here:**
- Reusable StyleSheet objects
- Theme definitions
- Typography scales
- Spacing systems

---

### `/types` - TypeScript Types
**Purpose:** Global TypeScript type definitions

```
types/
├── index.ts                # Main types export
├── api.ts                  # API request/response types
├── navigation.ts           # Navigation types
├── user.ts                 # User-related types
├── match.ts                # Match-related types
└── env.d.ts                # Environment variable types
```

**What belongs here:**
- Types used across multiple features
- API response types
- Navigation param types
- Shared data models

**⚠️ Feature-specific types:**
Keep in the feature folder (`features/matches/types.ts`)

---

### `/utils` - Utility Functions
**Purpose:** Helper functions and utilities

```
utils/
├── validators/             # Validation functions
│   ├── emailValidator.ts
│   └── phoneValidator.ts
├── formatters/             # Data formatting
│   ├── dateFormatter.ts
│   └── currencyFormatter.ts
├── storage/                # Local storage helpers
│   └── asyncStorage.ts
├── permissions/            # Permission handling
│   └── permissionHelper.ts
└── [other utilities]
```

**What belongs here:**
- Pure functions (no side effects)
- Data transformation utilities
- Validation functions
- Date/time helpers
- String manipulation
- Math calculations

---

## 🚀 Migration Strategy

### Current State (Working)
```
src/
├── components/             ✅ Well-organized
├── constants/              ✅ Well-organized
├── data/                   ✅ Has mockMatches
├── hooks/                  ✅ Has useAuth, useOnboardingFlow, useImagePicker
├── lib/                    ✅ Has supabase.ts
├── navigation/             ✅ Has AppNavigator
├── screens/                ✅ Has all main screens
├── styles/                 ✅ Has commonStyles
```

### Phase 1: Immediate (No Breaking Changes)
1. ✅ Create new folders (`context`, `features`, `services`, `types`, `utils`)
2. ✅ Document structure (this file)
3. Add placeholder README files in new folders
4. **App remains fully operational**

### Phase 2: Gradual Migration (As You Build)
When adding NEW features:
1. Create feature folder: `features/[feature-name]`
2. Add feature-specific code there
3. Keep existing code in current locations

Example - Adding Match Creation:
```
features/matches/
├── components/
│   └── MatchCreationForm.tsx
├── screens/
│   └── CreateMatch.tsx
├── services/
│   └── matchService.ts
└── types.ts
```

### Phase 3: Refactoring (Optional, Later)
When you have time:
1. Move `screens/Match.tsx` → `features/matches/screens/MatchDetails.tsx`
2. Move match-related logic from `Home.tsx` to match feature
3. Update imports

---

## 📝 Best Practices

### 1. **Barrel Exports (index.ts)**
Always create `index.ts` for clean imports:

```typescript
// features/matches/index.ts
export { MatchCreationForm } from './components/MatchCreationForm';
export { CreateMatch } from './screens/CreateMatch';
export { matchService } from './services/matchService';
export * from './types';

// Usage in other files
import { MatchCreationForm, matchService } from '@/features/matches';
```

### 2. **Import Aliases**
Configure TypeScript for cleaner imports:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@features/*": ["./src/features/*"],
      "@services/*": ["./src/services/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@utils/*": ["./src/utils/*"],
      "@constants/*": ["./src/constants/*"]
    }
  }
}
```

### 3. **File Naming Conventions**
- **Components:** PascalCase - `MatchCard.tsx`
- **Hooks:** camelCase with 'use' - `useMatchSearch.ts`
- **Utils:** camelCase - `dateFormatter.ts`
- **Services:** camelCase with 'Service' - `matchService.ts`
- **Types:** camelCase - `types.ts`
- **Constants:** camelCase - `colors.ts`

### 4. **Feature Folder Size**
Keep features focused:
- **Good:** 5-15 files per feature
- **Too Large:** 30+ files → Split into sub-features
- **Too Small:** 1-2 files → Might not need a feature folder

### 5. **Shared vs Feature-Specific**
**Move to shared (`/components`, `/hooks`, `/utils`) when:**
- Used in 2+ features
- No feature-specific business logic
- Could be open-sourced

**Keep in feature folder when:**
- Only used in one feature
- Contains feature-specific logic
- Tightly coupled to feature data

---

## 🎯 Tennis App Specific Guidelines

### Match Management
```
features/matches/
├── components/
│   ├── MatchCard.tsx           # Display match info
│   ├── MatchFilters.tsx        # Filter by sport, skill, location
│   ├── ParticipantList.tsx     # Show participants
│   └── CourtSelector.tsx       # Select court/location
├── screens/
│   ├── MatchBrowse.tsx         # Browse available matches
│   ├── MatchCreate.tsx         # Create new match
│   ├── MatchDetails.tsx        # View match details
│   └── MyMatches.tsx           # User's matches
├── services/
│   └── matchService.ts         # CRUD operations
└── types.ts                    # Match, Participant types
```

### User Profiles
```
features/profile/
├── components/
│   ├── ProfileHeader.tsx       # User avatar, name, stats
│   ├── SkillLevel.tsx          # Display skill level
│   ├── SportBadges.tsx         # Tennis, Pickleball badges
│   └── MatchHistory.tsx        # Past matches
├── screens/
│   ├── UserProfile.tsx         # View profile
│   ├── EditProfile.tsx         # Edit own profile
│   └── Settings.tsx            # User settings
└── types.ts                    # User, Profile types
```

### Location & Maps
```
features/map/
├── components/
│   ├── CourtMarker.tsx         # Tennis court marker
│   ├── MatchMarker.tsx         # Match location marker
│   └── MapFilters.tsx          # Filter by distance, sport
├── screens/
│   └── MapView.tsx             # Main map screen
└── types.ts                    # Location, Court types
```

### Messaging
```
features/chat/
├── components/
│   ├── ChatBubble.tsx          # Message bubble
│   ├── MessageInput.tsx        # Text input
│   └── TypingIndicator.tsx     # "User is typing..."
├── screens/
│   ├── ChatList.tsx            # All conversations
│   └── ChatRoom.tsx            # Single conversation
└── types.ts                    # Message, Conversation types
```

---

## 📚 Additional Documentation

### Related Documentation
- `/docs/OVERLAY_SYSTEM.md` - Overlay component system
- `/docs/Tennis App MVP - Specs - Rev02.docx` - Product specifications
- `README.md` (root) - Project setup and installation

### Future Documentation
- `/docs/API.md` - API integration guide
- `/docs/TESTING.md` - Testing strategy
- `/docs/DEPLOYMENT.md` - Deployment process
- `/features/[feature]/README.md` - Feature-specific docs

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 20, 2025 | Initial folder structure documentation |

---

## 🤝 Contributing

When adding new features:
1. Follow the folder structure guidelines
2. Update this documentation if adding new top-level folders
3. Add README.md to new feature folders
4. Use barrel exports (index.ts) for clean imports
5. Keep features focused and cohesive

---

## 📞 Questions?

- **Folder placement unclear?** → Add to `/components` or `/utils` first, move to feature later
- **Feature vs shared?** → If used once, it's feature-specific
- **Where to put types?** → Shared types → `/types`, feature types → `features/[name]/types.ts`

---

**Remember:** This structure grows with your app. Start simple, refactor as needed. The goal is **clarity and maintainability**, not perfect organization on day one.
