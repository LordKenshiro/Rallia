# Interface Switching

## Overview

Users with both sports active can switch between Tennis and Pickleball universes.

## Switch Mechanism

### Switch Button

- Button located in the app header
- Shows current sport mode clearly
- Tapping the button opens a modal for sport selection

### Sport Selection Modal

- Modal displays available sports (Tennis, Pickleball)
- Current sport is highlighted/indicated
- Clicking a sport in the modal switches directly - no confirmation required
- App data updates immediately when selection changes
- Modal closes automatically after selection

### Selection Flow

```mermaid
flowchart TD
    A[User taps switch button in header] --> B[Open sport selection modal]
    B --> C[User clicks sport in modal]
    C --> D[Switch occurs immediately - no confirmation]
    D --> E[App data updates with new sport context]
    E --> F[Modal closes automatically]
    F --> G[Interface reloads with new sport]
```

## Behavior

### What Changes on Switch

| Element            | Behavior                                    |
| ------------------ | ------------------------------------------- |
| Player Directory   | Shows players of the new sport              |
| Matches            | Shows matches of the new sport              |
| Groups/Communities | Shows groups of the new sport               |
| Ratings            | Shows rating for the new sport              |
| Reputation         | Shared across sports (same player behavior) |
| Navigation         | Updates to reflect sport context            |
| Theme/Colors       | Updates to sport-specific palette           |

### What Persists

| Element       | Behavior                              |
| ------------- | ------------------------------------- |
| User account  | Same account, different sport profile |
| Settings      | Most settings are shared              |
| Blocked users | Blocks apply across sports            |

## Dormant Sport Activation

If a user selects a dormant sport from the modal:

```mermaid
flowchart TD
    A[User opens sport selection modal] --> B[User selects dormant sport]
    B --> C{Target sport active?}
    C -->|Yes| D[Switch to selected sport]
    C -->|No| E[Show activation prompt in modal]
    E --> F{User wants to activate?}
    F -->|Yes| G[Close modal and go to sport-specific onboarding]
    F -->|No| H[Stay in modal, return to current sport]
    G --> I[Complete onboarding]
    I --> D
    D --> J[App data updates with new sport context]
```

## UX Guidelines

- Make current sport always visible (header, tab bar, etc.)
- Use animation for smooth transition
- Preserve navigation state when possible
