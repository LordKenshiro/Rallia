# Services Directory

## Purpose
API calls and external service integrations for the Rallia Tennis App.

## Structure
```
services/
├── api/            # API client configuration
├── auth/           # Authentication services
├── matches/        # Match-related API calls
├── users/          # User-related API calls
├── chat/           # Messaging services
└── location/       # Location and map services
```

## Usage Pattern

### Creating a Service
```typescript
// services/matches/matchService.ts
import { supabase } from '@/lib/supabase';

export const matchService = {
  async getMatches() {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async createMatch(matchData) {
    const { data, error } = await supabase
      .from('matches')
      .insert(matchData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};
```

### Using a Service
```typescript
// In a component or hook
import { matchService } from '@/services/matches/matchService';

const fetchMatches = async () => {
  try {
    const matches = await matchService.getMatches();
    setMatches(matches);
  } catch (error) {
    console.error('Failed to fetch matches:', error);
  }
};
```

## Best Practices
1. **Separation of Concerns** - Keep API logic separate from components
2. **Error Handling** - Always handle errors in services
3. **Type Safety** - Use TypeScript for request/response types
4. **Reusability** - Make services generic and reusable
5. **Testing** - Services are easy to unit test in isolation

## Current Status
- ✅ Supabase configured in `/lib/supabase.ts`
- 🚧 Service modules to be created as features are implemented

## Next Steps
1. Create `matchService.ts` when implementing match management
2. Create `userService.ts` for user profile operations
3. Create `chatService.ts` for messaging features
