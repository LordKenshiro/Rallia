# Pre-Onboarding: Sport Selection

## Overview

Sport selection happens at two points in the user journey:

1. **Initial App Launch** (Pre-authentication): Full-screen overlay to enable sport mode immediately
2. **During Onboarding** (Post-authentication): Step 2 of the onboarding wizard to save to user profile

This dual approach allows the app to provide value immediately while still collecting sport preferences for authenticated users.

## Initial App Launch: Sport Selection Overlay

### When It Appears

- **First-time app launch**: Full-screen overlay appears immediately when users open the app for the first time right after the splash animation has completed
- **Purpose**: Enable sport selector/mode switching right away, before authentication
- **Rationale**: Allows users to browse and explore the app in their preferred sport mode without requiring sign-up

### UI Presentation

- **Full-screen overlay**: Blocks the entire app interface until sport selection is made
- **Cannot be dismissed**: Users must select at least one sport to proceed
- **Visual design**: Should be clear, welcoming, and visually distinct

### Question

> "Which sport are you interested in?"

### Options

| Option     | Description                                    |
| ---------- | ---------------------------------------------- |
| Tennis     | Access to Tennis universe only                 |
| Pickleball | Access to Pickleball universe only             |
| Both       | Access to both Tennis and Pickleball universes |

### Selection Behavior

- Users can select one or both sports
- At least one sport must be selected to proceed
- Selection immediately enables the sport selector/mode switcher in the app
- The first sport selected in the overlay is used
- Users can change their sport selection later via the sport selector

### After Selection

- Overlay dismisses
- App enters the selected sport mode(s)
- Permission requests are presented (see below)
- User can now browse the app as a guest
- Sport selector is enabled and visible in the UI
- If both sports selected, user can switch between them using the sport selector

### Storage

- Selection is stored locally (device storage)
- Used to initialize sport mode on subsequent app launches
- Not tied to user account until they complete onboarding

## Initial App Launch: Permission Requests

### When They Appear

- **Timing**: Immediately after sport selection overlay is dismissed
- **Sequence**: All three permissions are requested back-to-back in rapid succession
- **Purpose**: Enable core app functionality that requires system permissions

### Permissions Requested

The following permissions are requested sequentially on first app launch:

| Permission        | Purpose                                                  | Required For                                                            |
| ----------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Notifications** | Send push notifications for matches, messages, reminders | Match invitations, chat messages, match reminders, system updates       |
| **Location**      | Find nearby players, courts, and matches                 | Location-based match discovery, court search, player proximity features |
| **Calendar**      | Sync matches with device calendar                        | Adding matches to calendar, calendar reminders, conflict detection      |

### Request Sequence

1. **Notifications Permission** → System permission dialog appears
2. **Location Permission** → System permission dialog appears (immediately after notifications)
3. **Calendar Permission** → System permission dialog appears (immediately after location)

### User Response Handling

**If User Grants All Permissions:**

- App proceeds to main interface
- All location-based features are enabled
- Notifications are enabled for match-related events
- Calendar sync is enabled

**If User Denies Any Permission:**

- App still proceeds to main interface
- Features requiring denied permissions are disabled or limited
- User can grant permissions later via device settings
- App should gracefully handle missing permissions

**Partial Grants:**

- App functions with available permissions
- Features requiring denied permissions show appropriate messaging
- Users can be prompted to enable permissions later when needed

### Permission Rationale Messages

Before requesting each permission, the app should explain why it's needed:

- **Notifications**: "Stay updated on match invitations and messages"
- **Location**: "Find players and courts near you"
- **Calendar**: "Sync your matches with your calendar"

### Re-requesting Permissions

- If permissions are denied, the app can re-request them:
  - When user attempts to use a feature requiring the permission
  - Via in-app settings/preferences
  - With clear explanation of benefits

### Platform-Specific Notes

**iOS:**

- Permission dialogs are system-native
- Users can grant/deny each permission independently
- "Don't Allow" can be changed later in Settings

**Android:**

- Runtime permissions for location and calendar
- Notification permission may vary by Android version
- Users can manage permissions in app settings

## Onboarding: Sport Selection (Step 2)

> **See [Onboarding Step 2](./onboarding.md#step-2-sport-selection)**

Sport selection also occurs during the onboarding wizard as Step 2, after authentication. This saves the sport preference to the user's profile and determines which sport-specific onboarding steps follow.

## Sport Selection (Onboarding Step 2)

### Question

> "Which sport do you want to play?"

### Options

| Option     | Description                                    |
| ---------- | ---------------------------------------------- |
| Tennis     | Access to Tennis universe only                 |
| Pickleball | Access to Pickleball universe only             |
| Both       | Access to both Tennis and Pickleball universes |

### Selection Behavior

- Users can select one or both sports
- Selection determines which sport-specific onboarding steps follow
- If both sports are selected, sport-specific steps are shown for each sport sequentially

## Architecture Notes

> **Important:** Adopt an extensible architecture allowing fluid addition of new disciplines in the future (padel, badminton, etc.).

### Single Account, Multiple Profiles

- One account per player
- Data representation allows "virtual" existence of two or more sport profiles
- If user selects Tennis only, the Pickleball profile is "dormant" until activated
- If user selects Pickleball only, the Tennis profile is "dormant" until activated
- If user selects both, both profiles are active

### Dormant Profile Activation

Users can activate a dormant sport profile later from profile:

1. Go to Profile > Sport Profile
2. Activate the dormant sport
3. Complete sport-specific onboarding (skill level, preferences)

## Relationship Between Initial Selection and Onboarding

### Initial Overlay Selection

- **Purpose**: Enable sport mode immediately for browsing
- **Storage**: Local device storage only
- **Scope**: App-wide sport mode switching
- **Can be changed**: Via sport selector at any time

### Onboarding Selection

- **Purpose**: Save sport preference to user profile
- **Storage**: User account/profile
- **Scope**: Determines which sport-specific onboarding steps appear
- **Can be changed**: Via profile settings after onboarding

### Synchronization

- When user completes onboarding, their initial sport selection (if still valid) is saved to their profile
- If user changes sport selection between initial overlay and onboarding, onboarding selection takes precedence
- After onboarding, profile sport preferences override initial local selection

## UX Guidelines

### Initial Overlay

- Make selection visually clear with sport icons
- Cannot be dismissed - must select at least one sport
- Explain what each choice means
- Keep it simple and fast - users want to explore the app

### Onboarding Selection

- Make selection visually clear with sport icons
- Allow changing selection before proceeding
- Explain what each choice means
- Show clear indication of which steps will follow based on selection
