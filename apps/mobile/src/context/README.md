# Context Directory

## Purpose

React Context providers for global state management across the app.

## Structure

```
context/
├── AuthContext.tsx         # Authentication state
├── UserContext.tsx         # Current user data
├── MatchContext.tsx        # Match filtering/search state
├── NotificationContext.tsx # App-wide notifications
└── index.ts                # Barrel export
```

## When to Use Context

Use React Context for:

- ✅ Authentication state (logged in/out, user session)
- ✅ Current user profile data
- ✅ Theme preferences (light/dark mode)
- ✅ App-wide settings
- ✅ Real-time data (notifications, online status)

**Don't use for:**

- ❌ Local component state (use useState)
- ❌ Server data (use React Query or SWR)
- ❌ Complex state logic (use Zustand or Redux)

## Example Implementation

### Auth Context

```typescript
// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Usage in App.tsx

```typescript
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
```

### Usage in Components

```typescript
import { useAuth } from '@/context/AuthContext';

const MyComponent = () => {
  const { session, signOut } = useAuth();

  return (
    <View>
      {session && <Text>Welcome, {session.user.email}</Text>}
      <Button onPress={signOut}>Sign Out</Button>
    </View>
  );
};
```

## Current Status

- ✅ Auth logic exists in `hooks/useAuth.ts`
- 🔄 Can be migrated to Context when needed
- 🚧 No context providers created yet

## Migration Strategy

### Current (Hook-based)

```typescript
// hooks/useAuth.ts
export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  // ... logic
  return { session, loading, signOut };
};
```

### Future (Context-based)

When you need auth state in multiple components without prop drilling:

1. Create AuthContext.tsx
2. Move logic from useAuth hook to AuthProvider
3. Wrap App.tsx with AuthProvider
4. Use useAuth hook that consumes context

## Alternative: Zustand

For complex state management, consider Zustand instead:

```bash
npm install zustand
```

```typescript
// stores/authStore.ts
import create from 'zustand';

interface AuthState {
  session: Session | null;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(set => ({
  session: null,
  setSession: session => set({ session }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },
}));
```

## Best Practices

1. **Keep Context Focused** - One context per domain (auth, user, theme)
2. **Avoid Over-Contexting** - Don't put everything in context
3. **Split Contexts** - Separate contexts to prevent unnecessary re-renders
4. **Use TypeScript** - Type your context values
5. **Default Values** - Provide sensible defaults or throw errors

## Next Steps

1. Evaluate if Context is needed (current hooks may be sufficient)
2. If implementing, start with AuthContext
3. Consider Zustand for complex state instead of Context
4. Document context usage patterns
