# Favorites

## Overview

A personal list of preferred players for quick access and match invitations.

## Behavior

### Default State

- Favorites list exists by default for every user
- Initially empty
- No limit on number of favorites

### Adding Favorites

From player profile or directory:

1. Tap "Add to Favorites" button
2. Player is added immediately
3. Confirmation shown

### Removing Favorites

From favorites list or player profile:

1. Tap "Remove from Favorites"
2. Player is removed immediately
3. No confirmation needed (can re-add easily)

## Use Cases

### Match Creation

When creating a match with "Private" visibility:

- Favorites list is a quick-select option
- Can select individual favorites
- Can select entire favorites list

### Quick Actions

From favorites list:

- View profile
- Invite to play
- Message
- Remove from favorites

## Display

### Favorites List View

```
┌─────────────────────────────────────────┐
│ ⭐ Favorites (12)                       │
├─────────────────────────────────────────┤
│ [Photo] Jean D.    NTRP 4.0 ✓  [Invite] │
│ [Photo] Marie L.   NTRP 3.5    [Invite] │
│ [Photo] Pierre M.  NTRP 4.5 ✓  [Invite] │
│ ...                                     │
└─────────────────────────────────────────┘
```

### Indicator on Profiles

When viewing a favorited player's profile:

- Star icon filled in
- "In Favorites" label
- Button shows "Remove from Favorites"

## Notifications

- No notifications for being added/removed from someone's favorites
- Favorites are private to each user

## Sport Separation

Favorites are separate per sport universe:

- Tennis favorites
- Pickleball favorites

A player can be in both lists if they play both sports.
