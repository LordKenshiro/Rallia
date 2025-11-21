# Types Directory

## Purpose
Global TypeScript type definitions shared across multiple features.

## Structure
```
types/
├── index.ts        # Main type exports
├── api.ts          # API request/response types
├── navigation.ts   # Navigation parameter types
├── user.ts         # User-related types
└── match.ts        # Match-related types
```

## Usage

### Example Type Definitions
```typescript
// types/user.ts
export interface User {
  id: string;
  email: string;
  fullName: string;
  username: string;
  dateOfBirth: Date;
  gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
  phoneNumber: string;
  profileImage?: string;
  sports: string[];
  skillLevel?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  matchesPlayed: number;
  matchesWon: number;
  rating: number;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}
```

### Using Types
```typescript
import { User, UserProfile } from '@/types/user';

const user: User = {
  id: '123',
  email: 'player@example.com',
  // ...
};
```

## Best Practices
1. **Feature-Specific Types** - Keep in feature folders if only used there
2. **Shared Types** - Put here if used in 2+ features
3. **API Types** - Match backend schema exactly
4. **Type Safety** - Use strict types, avoid `any`
5. **Documentation** - Add JSDoc comments for complex types

## Guidelines

### When to add types here:
- ✅ Used in multiple features
- ✅ Core data models (User, Match, Message)
- ✅ API request/response shapes
- ✅ Navigation types

### Keep in feature folder when:
- ❌ Only used in one feature
- ❌ UI component props
- ❌ Feature-specific enums

## Current Status
- 🚧 Types to be added as features are implemented
- ✅ Some types defined inline in components (MatchCard.tsx has Match interface)

## Next Steps
1. Extract `Match` interface from MatchCard to `types/match.ts`
2. Create `types/user.ts` for user-related types
3. Create `types/navigation.ts` for React Navigation types
