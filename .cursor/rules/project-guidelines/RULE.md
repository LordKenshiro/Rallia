---
description: 'Core development guidelines for the Rallia monorepo - TypeScript, React Native, Next.js, Supabase'
alwaysApply: true
---

# Rallia Project Guidelines

## Monorepo Architecture

- **Apps**: `apps/mobile` (React Native + Expo), `apps/web` (Next.js)
- **Shared Packages**: `packages/shared-*` (components, hooks, services, types, utils, constants, translations)
- Use `@rallia/package-name` for imports (e.g., `@rallia/shared-components`)
- Prefer shared packages over duplicating code across apps
- Workspace deps use `"@rallia/shared-types": "*"` in package.json

## TypeScript

- **Strict mode enabled** - all code must pass strict type checking
- Generate Supabase types: `npm run db:generate-types:local`
- Types go to `packages/shared-types/src/supabase.ts` - **never manually edit**
- Define explicit return types for functions
- Prefer `interface` over `type` for object shapes

## Component Architecture

### Platform-Specific Files

- `.native.tsx` for React Native, `.web.tsx` for Next.js
- Import without extension: `import { Button } from './Button'` (tooling resolves platform)

### Organization

- Shared: `packages/shared-components/src/`
- App-specific: `apps/{mobile|web}/src/components/`
- Features: `apps/mobile/src/features/{feature-name}/`

### Patterns

- Functional components with hooks, named exports
- JSDoc for complex components
- TypeScript interfaces for props

## State Management

Use the simplest solution for each use case:

| Scenario                    | Solution                       |
| --------------------------- | ------------------------------ |
| Form inputs, UI toggles     | `useState`                     |
| Auth, profile, theme        | React Context                  |
| Server data (API responses) | TanStack Query (see Data Flow) |

### React Context Pattern

```typescript
interface MyContextType { value: string; setValue: (v: string) => void; }
const MyContext = createContext<MyContextType | undefined>(undefined);

export const MyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [value, setValue] = useState('');
  return <MyContext.Provider value={{ value, setValue }}>{children}</MyContext.Provider>;
};

export const useMyContext = () => {
  const context = useContext(MyContext);
  if (!context) throw new Error('useMyContext must be used within MyProvider');
  return context;
};
```

**Don't use**: Redux, Zustand, Jotai, or other state management libraries.

## Data Flow Architecture

```
Component → Custom Hook → TanStack Query → Service → Supabase/API
```

### Layer Responsibilities

1. **Components**: Consume hooks, render UI
2. **Custom Hooks** (`packages/shared-hooks/`): Wrap TanStack Query, expose clean API
3. **TanStack Query**: Cache, refetching, loading/error states
4. **Services** (`packages/shared-services/`): API calls, business logic
5. **Supabase/SDKs**: Raw database access

### Custom Hook Example

```typescript
export function useMatches(options: UseMatchesOptions = {}) {
  const query = useInfiniteQuery<MatchesPage, Error>({
    queryKey: matchKeys.list('discovery', options),
    queryFn: async ({ pageParam = 0 }) => {
      const matches = await getMatchesWithDetails({ ...options, offset: pageParam });
      return {
        matches,
        nextOffset: matches.length === options.limit ? pageParam + options.limit : null,
      };
    },
    getNextPageParam: lastPage => lastPage.nextOffset,
    staleTime: 1000 * 60 * 2,
  });
  const matches = useMemo(() => query.data?.pages.flatMap(p => p.matches) ?? [], [query.data]);
  return {
    matches,
    isLoading: query.isLoading,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
```

### Query Keys

```typescript
export const matchKeys = {
  all: ['matches'] as const,
  list: (type: string, filters?: object) => [...matchKeys.all, 'list', type, filters] as const,
  detail: (id: string) => [...matchKeys.all, 'detail', id] as const,
};
```

### Rules

- Components never call Supabase directly
- Hooks delegate business logic to services
- Services are pure async functions (no React)
- Invalidate after mutations: `queryClient.invalidateQueries({ queryKey: matchKeys.all })`

## Internationalization (i18n)

- **Package**: `@rallia/shared-translations` with `en-US.json`, `fr-CA.json`
- **Mobile**: i18next (`useTranslation` hook)
- **Web**: next-intl (`useTranslations` hook)

### Usage

```typescript
// Mobile
const { t, ready } = useTranslation();
if (!ready) return <Loading />;
return <Text>{t('common.welcome')}</Text>;

// Web
const t = useTranslations('common');
return <h1>{t('welcome')}</h1>;
```

### Key Format

- Dot notation: `namespace.section.key`
- Interpolation: `{variable}` (single braces)
- Always add to **both** locale files
- Reference: `packages/shared-translations/USAGE.md`

## Styling

### Design System

- Use `@rallia/design-system` tokens for colors, spacing, radius
- **Never hardcode colors or spacing** - use design tokens
- Import: `import { primary, spacingPixels, lightTheme, darkTheme } from '@rallia/design-system'`
- **Avoid deprecated exports**: `COLORS`, `ANIMATION_DELAYS` are legacy - use modern tokens instead

### Platform

- **Mobile**: NativeWind (Tailwind) or StyleSheet.create
- **Web**: Tailwind CSS classes
- Support light/dark themes via design tokens

## Database & Supabase

- Migrations: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- Never modify existing migrations - create new ones
- Use RPC functions for complex queries
- Use `DatabaseService` from `@rallia/shared-services`, not direct Supabase clients
- After schema changes: `npm run db:generate-types:local`, commit types

## Code Organization

### File Naming

- Components: `PascalCase.tsx`
- Hooks/utils: `camelCase.ts`
- Scripts: `kebab-case.js`

### Import Order

1. React/React Native
2. Third-party libraries
3. `@rallia/*` packages
4. Relative imports
5. Type-only imports (`import type`)

### Package Locations

- Hooks: `packages/shared-hooks/src/`
- Services: `packages/shared-services/src/` (organized by domain: `matches/`, `notifications/`, etc.)
- Utils: `packages/shared-utils/src/`
- Context: `apps/mobile/src/context/` or `packages/shared-hooks/src/`
- Navigation types: `apps/mobile/src/navigation/types.ts`

## Testing

- Tests next to source: `Component.test.tsx`
- Jest + React Testing Library
- Descriptive names: `describe('Component', () => { it('should...') })`

## Git

- Conventional commits preferred
- Always commit migrations and generated Supabase types
- Never commit `node_modules` or build artifacts

## Performance

- `React.memo` for expensive components
- Avoid inline object/array creation in render
- Use `useMemo`/`useCallback` appropriately
- Keep shared packages lightweight

## Logging

Use `Logger` from `@rallia/shared-services` instead of console.log:

```typescript
import { Logger } from '@rallia/shared-services';

Logger.info('User signed in', { userId: '123' });
Logger.error('Failed to load', error, { context: 'ProfileScreen' });
Logger.warn('Slow network', { latency: 5000 });
```

## Navigation (Mobile)

- Types centralized in `apps/mobile/src/navigation/types.ts`
- Use typed screen props: `HomeStackScreenProps<'HomeScreen'>`
- Shared screens (UserProfile, Settings) live in RootStack, accessible from any tab

## Edge Functions

- Location: `supabase/functions/{function-name}/index.ts`
- Runtime: Deno (TypeScript)
- Use `Deno.env.get()` for environment variables
- Handle CORS preflight in all functions

## Environment Variables

- **Mobile**: Prefix with `EXPO_PUBLIC_` for client-side access
- **Web**: Use `process.env.NEXT_PUBLIC_` for client, `process.env.` for server
- **Edge Functions**: Use `Deno.env.get()`
- Never commit `.env` files - use `.env.example` as template

## Error Handling

- Error boundaries for app-level handling
- Sentry for production error tracking
- Use `Logger.error()` instead of console.error
- Handle null/undefined explicitly with optional chaining

## Development Commands

```bash
npm run mobile          # Start Expo dev server
npm run web             # Start Next.js dev server
npm run type-check      # TypeScript checking
npm run lint            # ESLint (--fix to auto-fix)
npm run db:reset        # Reset local database
npm run check-deps      # Verify no dependency conflicts
```

## Best Practices

### Do's ✅

- Use shared packages for cross-platform code
- Follow the design system
- Write type-safe code
- Document complex logic with JSDoc

### Don'ts ❌

- Don't duplicate code across apps
- Don't hardcode colors/spacing
- Don't edit generated Supabase types
- Don't call Supabase directly from components
- Don't use Redux/Zustand
- Don't hardcode strings - use i18n

## References

- Architecture: `apps/mobile/MONOREPO_ARCHITECTURE.md`
- Design system: `packages/design-system/`
- i18n: `packages/shared-translations/USAGE.md`
- Context examples: `apps/mobile/src/context/`
- Navigation types: `apps/mobile/src/navigation/types.ts`
- Edge functions: `supabase/functions/`
