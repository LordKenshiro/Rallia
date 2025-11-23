# Rallia Monorepo Structure

## 📁 Recommended Folder Structure

```
rallia/                              # Root monorepo
├── README.md                        # Project overview
├── package.json                     # Root package.json (workspace config)
├── turbo.json                       # Turborepo config (optional but recommended)
├── .gitignore
├── .env.example
│
├── apps/                            # Applications (mobile, web)
│   ├── mobile/                      # React Native + Expo app
│   │   ├── app.json
│   │   ├── App.tsx
│   │   ├── package.json             # Mobile-specific dependencies
│   │   ├── tsconfig.json
│   │   ├── metro.config.js
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   └── icons/
│   │   └── src/
│   │       ├── screens/             # Mobile-specific screens
│   │       ├── navigation/          # Mobile navigation (React Navigation)
│   │       └── mobile-specific/     # Mobile-only code
│   │
│   └── web/                         # Next.js web app
│       ├── next.config.js
│       ├── package.json             # Web-specific dependencies
│       ├── tsconfig.json
│       ├── public/
│       │   ├── images/
│       │   └── icons/
│       └── src/
│           ├── pages/               # Next.js pages
│           ├── app/                 # Next.js 13+ app router (if using)
│           └── web-specific/        # Web-only code
│
├── packages/                        # Shared packages
│   ├── shared-components/           # Shared UI components
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── components/
│   │       │   ├── Button/
│   │       │   │   ├── Button.tsx
│   │       │   │   ├── Button.native.tsx  # Mobile-specific
│   │       │   │   └── Button.web.tsx     # Web-specific
│   │       │   ├── Card/
│   │       │   ├── Input/
│   │       │   └── index.ts
│   │       └── styles/
│   │           └── commonStyles.ts
│   │
│   ├── shared-types/                # TypeScript types
│   │   ├── package.json
│   │   └── src/
│   │       ├── match.ts
│   │       ├── user.ts
│   │       └── index.ts
│   │
│   ├── shared-utils/                # Utility functions
│   │   ├── package.json
│   │   └── src/
│   │       ├── validators/
│   │       ├── formatters/
│   │       ├── constants/
│   │       └── index.ts
│   │
│   ├── shared-hooks/                # Custom React hooks
│   │   ├── package.json
│   │   └── src/
│   │       ├── useAuth.ts
│   │       ├── useDebounce.ts
│   │       └── index.ts
│   │
│   ├── shared-services/             # API services, Supabase client
│   │   ├── package.json
│   │   └── src/
│   │       ├── api/
│   │       │   ├── matchService.ts
│   │       │   └── userService.ts
│   │       ├── supabase/
│   │       │   └── client.ts
│   │       └── index.ts
│   │
│   └── shared-config/               # ESLint, Prettier configs
│       ├── package.json
│       ├── eslint-config/
│       └── tsconfig/
│
└── docs/                            # Documentation
    ├── ARCHITECTURE.md
    ├── DEVELOPMENT.md
    └── DEPLOYMENT.md
```

---

## 📦 Package.json Configuration

### Root `package.json` (Workspaces)

```json
{
  "name": "rallia",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "mobile": "npm run dev --workspace=apps/mobile",
    "web": "npm run dev --workspace=apps/web",
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.9.2"
  }
}
```

### `apps/mobile/package.json`

```json
{
  "name": "@rallia/mobile",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "dev": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "build": "expo build",
    "test": "jest"
  },
  "dependencies": {
    "@rallia/shared-components": "*",
    "@rallia/shared-types": "*",
    "@rallia/shared-utils": "*",
    "@rallia/shared-hooks": "*",
    "@rallia/shared-services": "*",
    "expo": "~54.0.25",
    "react-native": "0.81.5",
    "react": "19.1.0"
  }
}
```

### `apps/web/package.json`

```json
{
  "name": "@rallia/web",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest"
  },
  "dependencies": {
    "@rallia/shared-components": "*",
    "@rallia/shared-types": "*",
    "@rallia/shared-utils": "*",
    "@rallia/shared-hooks": "*",
    "@rallia/shared-services": "*",
    "next": "^14.0.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  }
}
```

### `packages/shared-components/package.json`

```json
{
  "name": "@rallia/shared-components",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "peerDependencies": {
    "react": "*",
    "react-native": "*"
  },
  "dependencies": {
    "@rallia/shared-types": "*"
  }
}
```

---

## 🎯 Platform-Specific Component Pattern

For components that need different implementations on mobile vs web:

### Shared Component with Platform Extensions

```typescript
// packages/shared-components/src/components/Button/Button.tsx
// Shared interface and base logic
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

// Base implementation (can be abstract or default)
export const ButtonBase = ({ title, onPress, variant, disabled }: ButtonProps) => {
  // Shared logic here
  return null; // Platform-specific implementation will override
};
```

```typescript
// packages/shared-components/src/components/Button/Button.native.tsx
// React Native implementation
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { ButtonProps } from './Button';

export const Button: React.FC<ButtonProps> = ({ title, onPress, variant = 'primary', disabled }) => {
  return (
    <TouchableOpacity 
      style={[styles.button, styles[variant], disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primary: {
    backgroundColor: '#00B8A9',
  },
  secondary: {
    backgroundColor: '#EF6F7B',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Button;
```

```typescript
// packages/shared-components/src/components/Button/Button.web.tsx
// Next.js web implementation
import React from 'react';
import type { ButtonProps } from './Button';
import styles from './Button.module.css';

export const Button: React.FC<ButtonProps> = ({ title, onPress, variant = 'primary', disabled }) => {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${disabled ? styles.disabled : ''}`}
      onClick={onPress}
      disabled={disabled}
    >
      {title}
    </button>
  );
};

export default Button;
```

```typescript
// packages/shared-components/src/components/Button/index.ts
// Platform-aware export
export { Button } from './Button.native'; // For React Native
// OR
export { Button } from './Button.web';    // For Next.js
```

---

## 🛠️ Monorepo Tools

### Option 1: Turborepo ⭐ (Recommended)

**Pros:**
- ✅ Fast builds with intelligent caching
- ✅ Simple configuration
- ✅ Great for JavaScript/TypeScript monorepos
- ✅ Parallel task execution

**Setup:**
```bash
npm install turbo --save-dev
```

**`turbo.json`:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

### Option 2: Yarn/npm Workspaces (Simpler)

**Pros:**
- ✅ No additional tools needed
- ✅ Built into npm/yarn
- ✅ Simpler for smaller projects

**Cons:**
- ❌ No task orchestration
- ❌ No caching
- ❌ Manual script management

### Option 3: Nx (Most Powerful)

**Pros:**
- ✅ Most powerful features
- ✅ Advanced caching and computation memoization
- ✅ Code generators

**Cons:**
- ❌ Steeper learning curve
- ❌ More complex configuration

---

## 🔄 Migration Strategy

### Phase 1: Restructure Current Mobile App (Week 1)
1. Create root folder structure
2. Move mobile app to `apps/mobile/`
3. Extract shared code to `packages/`
4. Set up workspaces
5. Test mobile app still works

### Phase 2: Set Up Web App (Week 2)
1. Create `apps/web/` with Next.js
2. Import shared packages
3. Create web-specific screens
4. Set up routing

### Phase 3: Implement Shared Components (Week 3-4)
1. Identify components to share
2. Create platform-specific versions
3. Test on both platforms

### Phase 4: CI/CD Setup (Week 5)
1. Configure builds for both platforms
2. Set up deployment pipelines
3. Add testing

---

## 📝 Import Examples

### In Mobile App
```typescript
// apps/mobile/src/screens/Home.tsx
import { Button } from '@rallia/shared-components';
import { Match } from '@rallia/shared-types';
import { validateEmail } from '@rallia/shared-utils';
import { useAuth } from '@rallia/shared-hooks';
import { matchService } from '@rallia/shared-services';
```

### In Web App
```typescript
// apps/web/src/pages/index.tsx
import { Button } from '@rallia/shared-components';
import { Match } from '@rallia/shared-types';
import { validateEmail } from '@rallia/shared-utils';
import { useAuth } from '@rallia/shared-hooks';
import { matchService } from '@rallia/shared-services';
```

---

## ✅ Benefits for Your Project

1. **Shared Business Logic**
   - Validators (already extracted!)
   - Match types
   - API services
   - Authentication logic

2. **Shared UI Components** (with platform variants)
   - Buttons
   - Cards
   - Inputs
   - Modals

3. **Shared Constants**
   - Colors
   - API endpoints
   - Animation timings

4. **Shared Hooks**
   - useAuth
   - useOnboardingFlow
   - Custom hooks

---

## 🎨 What Goes Where?

### `apps/mobile/` (Mobile-Only)
- React Navigation setup
- Native-specific screens
- Expo configuration
- Platform-specific features (Camera, GPS)

### `apps/web/` (Web-Only)
- Next.js pages/routes
- SEO components
- Web-specific layouts
- Server-side rendering logic

### `packages/shared-*` (Shared)
- Business logic
- Data types
- API calls
- Utilities
- Core components (with platform variants)

---

## 🚀 Quick Start Commands

```bash
# Install all dependencies
npm install

# Run mobile app
npm run mobile

# Run web app
npm run web

# Run both in parallel
npm run dev

# Build everything
npm run build

# Run tests
npm run test

# Lint all code
npm run lint
```

---

## 📊 Comparison Summary

| Feature | Monorepo | Separate Repos |
|---------|----------|----------------|
| Code Sharing | ✅ Easy | ❌ Difficult |
| Consistency | ✅ High | ❌ Low |
| Refactoring | ✅ Easy | ❌ Hard |
| Initial Setup | ⚠️ Complex | ✅ Simple |
| CI/CD | ⚠️ Complex | ✅ Simple |
| Dependencies | ✅ Unified | ❌ Duplicated |
| Team Coordination | ⚠️ Required | ✅ Independent |

**For your project: Monorepo wins! 🎉**

---

## 🎯 Final Recommendation

### ✅ Use a Monorepo with:
- **Turborepo** for build orchestration
- **npm workspaces** for dependency management
- **Shared packages** for common code
- **Platform-specific extensions** (.native.tsx / .web.tsx) for UI

This structure will:
1. ✅ Maximize code reuse
2. ✅ Maintain consistency
3. ✅ Enable rapid development
4. ✅ Scale as your app grows

---

Would you like me to create a migration script to restructure your current mobile app into this monorepo structure?
