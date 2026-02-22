# Locale & Theme Preferences

## Overview

Players can customize their app experience by selecting their preferred language (French or English) and visual theme (light, dark, or system). These preferences affect how content is displayed throughout the app.

## Access

- **Location:** Settings → App Preferences → Locale & Theme
- **Access Control:** Only the player can access their locale and theme settings
- **Sport Context:** Preferences apply across all sports (unified settings)

## Locale Settings

### Language Selection

Players can choose their preferred language for the app interface.

#### Supported Languages

| Language | Code | Status       |
| -------- | ---- | ------------ |
| English  | en   | ✅ Available |
| French   | fr   | ✅ Available |

#### Language Selection UI

```
┌─────────────────────────────────────────┐
│  Language                                │
│  ─────────────────────────────────────  │
│  English                 [✓ Selected]   │
│  Français                [ ]            │
└─────────────────────────────────────────┘
```

#### Language Change Behavior

- **Immediate:** Language changes apply immediately
- **Content:** All UI text, buttons, labels update
- **User Content:** User-generated content (names, messages) unchanged

## Theme Settings

### Visual Theme

Players can choose between light, dark, or system theme.

#### Theme Options

| Theme  | Description                 | Default        |
| ------ | --------------------------- | -------------- |
| Light  | Light background, dark text | System Default |
| Dark   | Dark background, light text | System Default |
| System | Follow device theme         | ✅ Yes         |

#### Theme Selection UI

```
┌─────────────────────────────────────────┐
│  Theme                                  │
│  ─────────────────────────────────────  │
│  System (Follows device)   [✓ Selected]│
│  Light                     [ ]          │
│  Dark                      [ ]          │
└─────────────────────────────────────────┘
```

#### Theme Behavior

- **Immediate:** Theme changes apply immediately
- **System Theme:** Automatically switches with device theme
- **Sport Colors:** Sport-specific colors adapt to theme
- **Contrast:** Ensures accessibility standards

### Sport-Specific Theming

While theme is unified, sport colors adapt:

#### Tennis Theme Colors

| Element    | Light Theme      | Dark Theme          |
| ---------- | ---------------- | ------------------- |
| Primary    | Green (#00A651)  | Green (#00D96B)     |
| Accent     | Yellow (#FFD700) | Yellow (#FFE55C)    |
| Background | White            | Dark Gray (#1A1A1A) |

#### Pickleball Theme Colors

| Element    | Light Theme      | Dark Theme          |
| ---------- | ---------------- | ------------------- |
| Primary    | Orange (#FF6B35) | Orange (#FF8C5A)    |
| Accent     | Teal (#00CED1)   | Teal (#4DD0E1)      |
| Background | White            | Dark Gray (#1A1A1A) |

## Locale & Theme UI

### Main Settings Screen

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
├─────────────────────────────────────────┤
│  Locale & Theme                          │
│                                         │
│  ─────────────────────────────────────  │
│  Language                                │
│  ─────────────────────────────────────  │
│  App Language            [English ▼]     │
│                                         │
│  ─────────────────────────────────────  │
│  Theme                                   │
│  ─────────────────────────────────────  │
│  App Theme            [System ▼]         │
└─────────────────────────────────────────┘
```

### Language Selection Screen

When tapping on "App Language":

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
├─────────────────────────────────────────┤
│  Language                                │
│                                         │
│  Select your preferred language:        │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ English                           │ │
│  │ [✓ Selected]                      │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Français                           │ │
│  │ [ ]                                │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Theme Selection Screen

When tapping on "App Theme":

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
├─────────────────────────────────────────┤
│  Theme                                  │
│                                         │
│  Select your preferred theme:           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ System (Follows device)           │ │
│  │ [✓ Selected]                      │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Light                             │ │
│  │ [ ]                                │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Dark                              │ │
│  │ [ ]                                │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Default Values

### First Launch

On first app launch, use these defaults:

| Setting  | Default Value                          | Source          |
| -------- | -------------------------------------- | --------------- |
| Language | Device language (if English or French) | Device settings |
| Theme    | System (follow device)                 | Device settings |

### Fallbacks

If device language not supported:

- **Language:** English (default)
- **Theme:** System (follows device theme)

## Validation & Constraints

### Language Support

- Only show languages that are fully translated
- Default to English if device language is not English or French
- Language changes apply immediately

### Theme Constraints

- Must maintain accessibility contrast ratios
- Sport colors must be distinguishable in both themes
- Text must be readable in all themes

## Localization Considerations

### Content Localization

| Content Type   | Localized | Notes                           |
| -------------- | --------- | ------------------------------- |
| UI Text        | ✅ Yes    | All buttons, labels, messages   |
| Error Messages | ✅ Yes    | User-facing errors              |
| Help Text      | ✅ Yes    | Instructions, tooltips          |
| User Content   | ❌ No     | Names, messages stay as-is      |
| Court Names    | ❌ No     | Court names unchanged           |
| Match Types    | ✅ Yes    | "Singles", "Doubles" translated |

## UX Guidelines

### Immediate Application

- Changes apply immediately (no restart required)
- Show visual feedback when switching theme
- Language changes update UI instantly

### Clear Options

- Use clear, descriptive labels
- Show current selection clearly
- Simple selection interface

### System Integration

- Respect system theme by default
- Auto-detect device language (if supported)
- Allow manual override

## Related Features

- [Profile Management](./profile-management.md) - User profile settings
- [Sport Modes](../02-sport-modes/README.md) - Sport-specific theming
- [Player Directory](../06-player-directory/README.md) - Localized player data display
