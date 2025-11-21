# Utils Directory

## Purpose
Reusable utility functions and helper modules.

## Structure
```
utils/
├── validators/      # Input validation functions
├── formatters/      # Data formatting utilities
├── storage/         # Local storage helpers
├── permissions/     # Permission handling
└── date/            # Date/time utilities
```

## Usage Patterns

### Validators
```typescript
// utils/validators/phoneValidator.ts
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
};

export const formatPhone = (phone: string): string => {
  return phone.replace(/[^0-9]/g, '').slice(0, 10);
};
```

### Formatters
```typescript
// utils/formatters/dateFormatter.ts
export const formatMatchDate = (date: Date): string => {
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
};

export const formatTimeRange = (start: string, end: string): string => {
  return `${start} - ${end}`;
};
```

### Storage
```typescript
// utils/storage/asyncStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async setItem(key: string, value: any) {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  },

  async getItem<T>(key: string): Promise<T | null> {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  },
};
```

## Best Practices
1. **Pure Functions** - No side effects, same input = same output
2. **Single Responsibility** - One function, one purpose
3. **Type Safety** - Use TypeScript for inputs/outputs
4. **Testing** - Utils are perfect for unit tests
5. **Documentation** - Add JSDoc comments

## Examples

### Input Validation (Already Implemented)
```typescript
// In PersonalInformationOverlay.tsx
const handleFullNameChange = (text: string) => {
  const validText = text.replace(/[^a-zA-Z\s]/g, '');
  setFullName(validText);
};

// Move to: utils/validators/nameValidator.ts
export const sanitizeFullName = (text: string): string => {
  return text.replace(/[^a-zA-Z\s]/g, '');
};

export const sanitizeUsername = (text: string): string => {
  return text.replace(/\s/g, '').slice(0, 10);
};

export const sanitizePhone = (text: string): string => {
  return text.replace(/[^0-9]/g, '').slice(0, 10);
};
```

## Current Status
- 🚧 No utils created yet
- ✅ Validation logic exists inline in components
- 📝 Ready for extraction as needed

## Next Steps
1. Extract validation functions from PersonalInformationOverlay
2. Create date formatting utilities for match dates
3. Create permission helpers for location/calendar
4. Add AsyncStorage wrapper utilities
