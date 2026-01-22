# Permissions Management

## Overview

Players can view and manage app permissions for device features (camera, location, contacts, notifications, etc.). Players can **enable** permissions directly from the app, but **cannot disable** permissions in-app. To disable permissions, players must navigate to their device settings. This screen shows the current status of all permissions and provides quick access to enable them or navigate to device settings for management.

## Access

- **Location:** Settings → Permissions
- **Access Control:** Only the player can access their permissions settings
- **Platform:** Settings vary by platform (iOS vs Android)

## Permission Types

### Required Permissions

These permissions are essential for core app functionality:

| Permission                 | Required For                           | Can Deny                                                 |
| -------------------------- | -------------------------------------- | -------------------------------------------------------- |
| Notifications              | Push notifications                     | ✅ Yes (via device settings)                             |
| Location (While Using App) | Court discovery, distance calculations | ✅ Yes (via device settings, with limited functionality) |

### Optional Permissions

These permissions enhance functionality but are not required:

| Permission        | Used For                               | Impact if Denied              |
| ----------------- | -------------------------------------- | ----------------------------- |
| Camera            | Profile photo, match photos            | Cannot upload photos          |
| Photo Library     | Profile photo, match photos            | Cannot select existing photos |
| Contacts          | Invite friends, find contacts          | Cannot import contacts        |
| Calendar          | Sync matches with calendar             | No calendar integration       |
| Location (Always) | Background location for nearby matches | Limited to foreground only    |

## Permission Details

### Location Permissions

#### While Using App (Required)

**What it's used for:**

- Finding nearby courts
- Calculating distances to matches
- Showing player locations (if enabled)
- Court discovery features

**What happens if denied:**

- App still works but with limited functionality
- Cannot use court discovery features
- Distance calculations unavailable
- Manual location entry required

**When requested:**

- First time accessing court discovery
- First time creating a match
- When enabling location-based features

#### Always (Optional)

**What it's used for:**

- Background location for nearby match suggestions
- Proximity-based notifications
- Enhanced match recommendations

**What happens if denied:**

- App works normally
- No background location features
- Only location while app is open

**When requested:**

- After enabling location-based match suggestions
- When enabling proximity notifications

### Camera Permission

**What it's used for:**

- Taking profile photos
- Taking match photos
- Scanning QR codes (if implemented)

**What happens if denied:**

- Cannot take photos in-app
- Can still upload from photo library
- Profile photo upload limited

**When requested:**

- First time tapping "Take Photo" for profile
- First time adding match photo

### Photo Library Permission

**What it's used for:**

- Selecting profile photos from library
- Selecting match photos from library
- Sharing match photos

**What happens if denied:**

- Cannot select photos from library
- Can still take new photos (if camera allowed)
- Limited photo selection options

**When requested:**

- First time tapping "Choose from Library"
- First time adding photo to match

### Contacts Permission

**What it's used for:**

- Finding friends who use the app
- Inviting contacts to join
- Importing contacts for invitations

**What happens if denied:**

- Cannot import contacts
- Cannot find friends automatically
- Manual friend search required

**When requested:**

- First time accessing "Find Friends"
- First time using contact import feature

### Calendar Permission

**What it's used for:**

- Syncing matches to device calendar
- Checking calendar availability
- Avoiding double-booking

**What happens if denied:**

- Cannot sync matches to calendar
- Cannot check calendar availability
- Manual calendar management required

**When requested:**

- First time enabling calendar sync
- First time checking availability

### Notifications Permission

**What it's used for:**

- Push notifications for matches
- Match reminders
- Social notifications

**What happens if denied:**

- No push notifications
- In-app notifications still work
- Email notifications still work

**When requested:**

- First app launch
- When enabling notifications in settings

## Permission Management Behavior

### In-App Actions

**What players CAN do in-app:**

- ✅ **Enable permissions:** Tap "Enable Permission" → System dialog appears → User grants permission
- ✅ **View permission status:** See which permissions are granted, denied, or not requested
- ✅ **Navigate to device settings:** Tap "Open Device Settings" → Goes to device settings for that permission

**What players CANNOT do in-app:**

- ❌ **Disable permissions:** Cannot disable/revoke permissions from within the app
- ❌ **Change permission level:** Cannot change from "While Using App" to "Always" or vice versa (must use device settings)

### Disabling Permissions

To disable a permission, players must:

1. Tap "Open Device Settings" button (for granted permissions)
2. Navigate to the permission in device settings
3. Disable the permission in device settings
4. Return to app (status will update automatically when screen is refreshed)

### Status Updates

- **On Screen Open:** Check current permission status from system
- **After Enabling:** Immediately update status after system dialog result
- **After Returning from Settings:** Refresh status when user returns to app

## Permission Request Flow

### Enabling Permissions (In-App)

When a permission is denied or not yet granted:

1. **Status Display:** Show current status (Denied/Not Granted)
2. **Action Button:** Display "Enable Permission" button
3. **User Taps:** Triggers system permission dialog
4. **System Dialog:** User grants or denies via system dialog
5. **Handle Result:**
   - **Granted:** Update status, show success feedback
   - **Denied:** Update status, show explanation of impact

### Managing Granted Permissions

When a permission is already granted:

1. **Status Display:** Show current status (Granted)
2. **Action Button:** Display "Open Device Settings" button
3. **User Taps:** Navigates to device settings for that permission
4. **Cannot Disable In-App:** All disabling must happen in device settings

### Re-requesting Denied Permissions

If a user denies a permission:

1. **Show Explanation:** Why permission is needed
2. **Offer Alternative:** Workaround if available
3. **Enable Button:** Always show "Enable Permission" button to retry
4. **Respect Choice:** Don't repeatedly show system dialog if user keeps denying
5. **Settings Option:** Also provide "Open Device Settings" as alternative

### Key Constraints

- **Cannot disable in-app:** Permissions can only be disabled via device settings
- **Can enable in-app:** Permissions can be enabled via system dialog triggered from app
- **Status sync:** App checks permission status when screen is opened/refreshed

### Permission Status Display

Show current permission status and available actions:

| Permission    | Status     | In-App Action          | Notes                               |
| ------------- | ---------- | ---------------------- | ----------------------------------- |
| Location      | ✅ Granted | [Open Device Settings] | Can only disable in device settings |
| Camera        | ❌ Denied  | [Enable Permission]    | Can enable in-app via system dialog |
| Contacts      | ⚠️ Limited | [Enable Permission]    | Can enable in-app via system dialog |
| Calendar      | ✅ Granted | [Open Device Settings] | Can only disable in device settings |
| Notifications | ✅ Granted | [Open Device Settings] | Can only disable in device settings |

**Key Behavior:**

- **Denied/Not Granted:** Show "Enable Permission" button → Triggers system permission dialog
- **Granted:** Show "Open Device Settings" button → Navigates to device settings where user can disable
- **Cannot disable in-app:** All permission disabling must happen in device settings

## Permission Management UI

### Main Permissions Screen

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
├─────────────────────────────────────────┤
│  Permissions                             │
│                                         │
│  Manage what Rallia can access on your  │
│  device.                                 │
│                                         │
│  ─────────────────────────────────────  │
│  Required                                │
│  ─────────────────────────────────────  │
│  📍 Location                             │
│  While Using App          [✅ Granted]   │
│  [Open Device Settings]                  │
│                                         │
│  🔔 Notifications                        │
│  Push Notifications       [✅ Granted]   │
│  [Open Device Settings]                  │
│                                         │
│  ─────────────────────────────────────  │
│  Optional                                │
│  ─────────────────────────────────────  │
│  📷 Camera                               │
│  Take Photos             [✅ Granted]   │
│  [Open Device Settings]                  │
│                                         │
│  🖼️ Photo Library                        │
│  Select Photos           [✅ Granted]   │
│  [Open Device Settings]                  │
│                                         │
│  👥 Contacts                             │
│  Find Friends            [❌ Denied]    │
│  [Enable Permission]                     │
│                                         │
│  📅 Calendar                             │
│  Sync Matches            [❌ Denied]    │
│  [Enable Permission]                     │
│                                         │
│  📍 Location (Always)                    │
│  Background Location     [❌ Denied]    │
│  [Enable Permission]                     │
└─────────────────────────────────────────┘
```

### Permission Detail Screen

When tapping on a permission, show details and appropriate action:

**For Granted Permissions:**

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
├─────────────────────────────────────────┤
│  Location Permission                     │
│                                         │
│  Current Status: ✅ Granted              │
│                                         │
│  ─────────────────────────────────────  │
│  What We Use It For                     │
│  ─────────────────────────────────────  │
│  • Finding nearby courts                │
│  • Calculating distances to matches     │
│  • Showing your location on matches     │
│  • Court discovery features             │
│                                         │
│  ─────────────────────────────────────  │
│  Current Settings                       │
│  ─────────────────────────────────────  │
│  While Using App          [✅ Enabled]   │
│  Always (Background)      [❌ Disabled] │
│                                         │
│  ─────────────────────────────────────  │
│  [Open Device Settings]                 │
│                                         │
│  Note: To disable this permission,      │
│  please use your device settings.       │
└─────────────────────────────────────────┘
```

**For Denied/Not Granted Permissions:**

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
├─────────────────────────────────────────┤
│  Contacts Permission                     │
│                                         │
│  Current Status: ❌ Not Granted          │
│                                         │
│  ─────────────────────────────────────  │
│  What We Use It For                     │
│  ─────────────────────────────────────  │
│  • Finding friends who use the app     │
│  • Inviting contacts to join            │
│  • Importing contacts for invitations   │
│                                         │
│  ─────────────────────────────────────  │
│  [Enable Permission]                    │
│                                         │
│  This will open a system dialog to      │
│  grant access to your contacts.         │
└─────────────────────────────────────────┘
```

## Platform-Specific Behavior

### iOS

#### Permission Types

- **Location When In Use:** While app is open
- **Location Always:** Background location
- **Camera:** Photo capture
- **Photo Library:** Full library access (iOS 14+)
- **Contacts:** Full contacts access
- **Calendar:** Full calendar access
- **Notifications:** Push notifications

#### iOS-Specific Features

- **Limited Photo Library:** Users can grant access to selected photos only
- **Precise Location:** Users can grant approximate location only
- **Tracking Permission:** Separate from location (if applicable)

### Android

#### Permission Types

- **Location (Foreground):** While app is in foreground
- **Location (Background):** While app is in background
- **Camera:** Photo capture
- **Storage:** Photo library access (Android 10+)
- **Contacts:** Contacts access
- **Calendar:** Calendar access
- **Notifications:** Push notifications

#### Android-Specific Features

- **Runtime Permissions:** Requested at runtime (Android 6+)
- **Permission Groups:** Some permissions grouped together
- **Background Location:** Requires separate permission (Android 10+)

## Permission Request Best Practices

### Timing

- **Request when needed:** Don't request all permissions at once
- **Context matters:** Request when feature is accessed
- **Explain first:** Show why before requesting

### Messaging

**Good:**

```
"Rallia needs access to your location to find
nearby courts and calculate distances to matches."
[Allow] [Not Now]
```

**Bad:**

```
"Rallia needs location permission"
[OK]
```

### Handling Denial

1. **Don't block:** App should still function
2. **Explain impact:** What features are limited
3. **Offer alternative:** Manual entry, etc.
4. **Respect choice:** Don't repeatedly ask

## Privacy Considerations

### Data Usage

- **Transparency:** Explain what data is collected
- **Purpose:** Explain why data is needed
- **Storage:** Explain how long data is stored
- **Sharing:** Explain if data is shared

### Location Privacy

- **Precise vs Approximate:** Allow users to choose
- **Location History:** Don't store location history unnecessarily
- **Sharing:** Only share location with match participants

### Contact Privacy

- **No Upload:** Contacts never uploaded to servers
- **Local Only:** Matching happens locally
- **No Storage:** Don't store contact data

## Permission Status Indicators

### Visual Indicators

| Status        | Icon | Color  | Meaning            |
| ------------- | ---- | ------ | ------------------ |
| Granted       | ✅   | Green  | Permission active  |
| Denied        | ❌   | Red    | Permission denied  |
| Limited       | ⚠️   | Yellow | Partial permission |
| Not Requested | ⏸️   | Gray   | Not yet requested  |

### Status Text

- **Granted:** "Enabled" or "Active"
- **Denied:** "Disabled" or "Not Allowed"
- **Limited:** "Limited Access" or "Partial"
- **Not Requested:** "Not Set" or "Not Requested"

## Validation & Constraints

### Permission Management Rules

- **Enable Only In-App:** Permissions can only be enabled/granted from within the app (via system dialog)
- **Disable Only In Settings:** Permissions can only be disabled/revoked via device settings (not in-app)
- **Status Check:** App must check permission status when permissions screen is opened
- **No In-App Toggle:** Cannot provide in-app toggle to disable permissions (must navigate to device settings)
- **System Dialog Required:** Enabling permissions always requires system permission dialog (cannot bypass)

### Required Behaviors

- Show "Enable Permission" button for denied/not granted permissions
- Show "Open Device Settings" button for granted permissions
- Update status immediately after permission is granted
- Refresh status when user returns from device settings
- Never show disable/revoke option in-app

### Platform Constraints

- **iOS:** Cannot programmatically disable permissions; must use Settings app
- **Android:** Cannot programmatically disable permissions; must use Settings app
- **Both Platforms:** Can only request permissions via system dialogs

## UX Guidelines

### Clear Communication

- Explain why permission is needed
- Show what user gains
- Be transparent about data usage

### Easy Management

- One-tap to enable permissions (triggers system dialog)
- One-tap access to device settings (for granted permissions)
- Clear status indicators
- Easy to understand impact
- Clear distinction between enable (in-app) vs disable (device settings)

### Respect User Choice

- Don't repeatedly show system dialogs if user keeps denying
- Always provide "Enable Permission" button for user to retry when ready
- Provide alternatives when possible
- App should function without optional permissions
- Make it clear that disabling requires device settings (not hidden or confusing)

### Mobile Optimization

- Large tap targets
- Clear visual hierarchy
- Easy navigation to device settings

## Related Features

- [Profile Management](./profile-management.md) - Camera/photo permissions for profile
- [Court Discovery](../11-courts/court-discovery.md) - Location permissions
- [Calendar Sync](../12-calendar/external-sync.md) - Calendar permissions
- [Notification Preferences](./notification-preferences.md) - Notification permissions
