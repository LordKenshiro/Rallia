# Rallia - Tennis & Pickleball Matchmaking Platform

A monorepo containing the complete source code for a cross-platform tennis and pickleball matchmaking application. This repo includes both mobile (React Native + Expo) and web (Next.js - coming soon) applications with shared packages for maximum code reuse.

## 🏗️ Monorepo Structure

```
rallia/
├── apps/
│   ├── mobile/          # React Native + Expo mobile app
│   └── web/             # Next.js web app (coming soon)
├── packages/
│   ├── shared-components/   # Reusable UI components
│   ├── shared-constants/    # Colors, animations, etc.
│   ├── shared-hooks/        # Custom React hooks
│   ├── shared-services/     # API services, Supabase client
│   ├── shared-types/        # TypeScript types
│   └── shared-utils/        # Utility functions, validators
```

## ✨ Key Features

- **Multi-platform support:** React Native + Expo for iOS, Android, and web; Next.js for web (coming soon)
- **Fast onboarding:** Social login with Supabase (email, Google, Apple), profile wizard
- **Matchmaking engine:** Create, join, and manage matches with advanced filtering
- **Court booking:** Integrated with club partners, Stripe payments
- **Community and chat:** Real-time messaging using Supabase Realtime
- **Player reputation:** Match feedback system with profile badges
- **Monorepo architecture:** Code sharing between mobile and web via shared packages

## 🛠️ Tech Stack

### Mobile App (apps/mobile)

- React Native 0.81.5 + Expo ~54.0.25
- TypeScript (strict mode)
- React Navigation
- Supabase (Auth, Database, Realtime)
- Stripe
- Sentry

### Web App (apps/web) - Coming Soon

- Next.js 14+
- TypeScript
- Same shared packages as mobile

### Shared Packages

- **shared-components**: Platform-specific UI components (.native.tsx / .web.tsx)
- **shared-constants**: COLORS, ANIMATION_DELAYS
- **shared-hooks**: useAuth, custom hooks
- **shared-services**: Supabase client, API services
- **shared-types**: TypeScript interfaces
- **shared-utils**: Validators, formatters

## 📋 Prerequisites

- Node.js v18+ (v20.19.4+ recommended)
- npm v9+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

## 🚀 Getting Started

### 1. Clone and Install

```bash
cd "c:\Users\kenmo\Documents\Version Finale Rallia\Rallia"
npm install
```

This will install all dependencies for the root workspace and link all packages.

### 2. Configure Supabase

- Go to [https://supabase.com](https://supabase.com)
- Create a project and get your `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Create `.env` file in `apps/mobile/`:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Mobile App

```bash
# From root directory
npm run mobile

# Or navigate to mobile app
cd apps/mobile
npm run dev
```

### 4. Run on Specific Platform

```bash
# Android
npm run mobile:android

# iOS
npm run mobile:ios
```

## 📦 Monorepo Commands

```bash
# Run mobile app
npm run mobile

# Run web app (when available)
npm run web

# Run both in parallel
npm run dev

# Build all apps
npm run build

# Run tests
npm run test

# Type checking
npm run type-check

# Lint all code
npm run lint

# Clean all node_modules and caches
npm run clean
```

## 📁 Working with Shared Packages

### Importing Shared Code

```typescript
// In mobile or web app
import { Overlay } from '@rallia/shared-components';
import { COLORS, ANIMATION_DELAYS } from '@rallia/shared-constants';
import { useAuth } from '@rallia/shared-hooks';
import { supabase } from '@rallia/shared-services';
import { Match, User } from '@rallia/shared-types';
import { validateEmail, validatePhoneNumber } from '@rallia/shared-utils';
```

### Adding Platform-Specific Components

Create `.native.tsx` for mobile and `.web.tsx` for web:

```
packages/shared-components/src/
├── Button/
│   ├── Button.tsx          # Shared interface
│   ├── Button.native.tsx   # React Native implementation
│   └── Button.web.tsx      # Next.js implementation
```

## 🏗️ Project Architecture

- **Feature-based structure**: Code organized by feature (onboarding, matches, profile)
- **Separation of concerns**: Components, hooks, services, types all separated
- **Shared packages**: Maximum code reuse between platforms
- **TypeScript strict mode**: Full type safety
- **Turborepo**: Fast builds with intelligent caching

## 📖 Documentation

- [Monorepo Architecture](./MONOREPO_ARCHITECTURE.md) - Detailed monorepo setup guide
- [Migration Guide](./apps/mobile/MIGRATION_SUMMARY.md) - How we migrated to monorepo
- [Onboarding Flow](./apps/mobile/ONBOARDING_FLOW_IMPLEMENTATION.md) - Onboarding implementation
- [Folder Structure](./apps/mobile/src/FOLDER_STRUCTURE.md) - Code organization

## 🤝 Contributing

Contributions, feature requests, and bug reports are welcome! Please open an issue or PR.

### Development Workflow

1. Make changes in appropriate package/app
2. Run type checking: `npm run type-check`
3. Run tests: `npm run test`
4. Test the app: `npm run mobile`
5. Commit changes

## 🔧 Troubleshooting

### TypeScript errors after installing packages

- Reload VS Code or restart TypeScript server
- Run `npm install` at root to ensure all workspaces are linked

### Module not found errors

- Ensure all packages are installed: `npm install`
- Check tsconfig.json paths are correct
- Verify package.json dependencies include `@rallia/*` packages

### Expo not starting

- Clear cache: `expo start -c`
- Delete node_modules: `npm run clean && npm install`

## 📄 License

[Your License Here]

---

**Making tennis and pickleball matchmaking seamless for players and facilities alike** 🎾 🏸
