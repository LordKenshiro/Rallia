# Notification Preferences

## Overview

Players can control how and when they receive notifications across all channels (push, email, SMS, in-app). For each notification type (e.g., match invitations, match updates, social interactions), players can toggle which channels they want to receive notifications on. This allows players to stay informed without being overwhelmed and customize their notification preferences to their communication style.

## Access

- **Location:** Settings → Notification Preferences
- **Access Control:** Only the player can access their notification preferences
- **Sport Context:** Preferences apply across all sports (unified settings)

## Notification Channels

### Channel Controls

| Channel              | Enable/Disable             | Description                       |
| -------------------- | -------------------------- | --------------------------------- |
| Push Notifications   | Toggle                     | Real-time alerts on mobile device |
| Email Notifications  | All / Important Only / Off | Email confirmations and summaries |
| SMS Notifications    | Toggle                     | Urgent reminders via text         |
| In-App Notifications | Always On                  | Notifications when app is open    |

### Channel-Specific Settings

#### Push Notifications

- **Enable/Disable:** Master toggle for all push notifications
- **Quiet Hours:** Set time range when push notifications are silenced
- **Sound:** Enable/disable notification sounds
- **Vibration:** Enable/disable vibration
- **Badge Count:** Show unread count on app icon

#### Email Notifications

| Setting         | Options                    | Default        |
| --------------- | -------------------------- | -------------- |
| Email Frequency | All / Important Only / Off | Important Only |
| Daily Digest    | Enable / Disable           | Disable        |
| Weekly Summary  | Enable / Disable           | Enable         |

**Important Only** includes:

- Match invitations
- Match confirmations
- Match cancellations
- Account security alerts

**All** includes everything above plus:

- Match reminders
- Social updates
- Weekly match suggestions
- Badge notifications

#### SMS Notifications

- **Enable/Disable:** Master toggle for SMS
- **Urgent Only:** Only send SMS for time-sensitive alerts
- **Phone Number:** Manage verified phone number

**Urgent SMS** includes:

- Match reminder (day of match)
- Match cancelled (within 24h of match time)
- Account security alerts

## Per-Type Channel Control

Players can control which channels (push, email, SMS) they want to receive for each notification type. This provides granular control over how notifications are delivered.

### How It Works

1. **Master Channel Toggles:** Players can enable/disable channels globally (e.g., turn off all push notifications)
2. **Per-Type Channel Selection:** For each notification type, players can choose which available channels to enable
3. **Channel Availability:** Not all notification types support all channels (e.g., SMS only for urgent notifications)
4. **Cascading Behavior:**
   - If a channel is disabled globally, it's automatically disabled for all notification types
   - If a channel is enabled globally but disabled for a specific type, that type won't use that channel
   - Core/critical notification types require at least one channel to be enabled

### Example

A player might configure:

- **New match invitation:** Push ✅, Email ✅, SMS ❌
- **Match accepted:** Push ✅, Email ❌, SMS ❌
- **Match cancelled:** Push ✅, Email ✅, SMS ✅

This allows players to receive urgent notifications (like match cancellations) on all channels, while less critical notifications (like match accepted) only via push.

## Notification Types

Players can toggle push, email, and/or SMS for each notification type. Each notification type shows which channels are available and allows players to enable/disable specific channels.

### Match Notifications

Control notifications related to matches. For each type, players can choose which channels (push, email, SMS) to receive:

| Notification Type           | Available Channels | Default Channels | Can Disable All  | Notes                  |
| --------------------------- | ------------------ | ---------------- | ---------------- | ---------------------- |
| New match invitation        | Push, Email        | Push, Email      | ❌ No (core)     | Must have at least one |
| Match accepted              | Push, Email        | Push, Email      | ✅ Yes           |                        |
| Match declined              | Push               | Push             | ✅ Yes           |                        |
| Match cancelled             | Push, Email, SMS   | Push, Email, SMS | ❌ No (critical) | Must have at least one |
| Match reminder (24h before) | Push, Email        | Push, Email      | ✅ Yes           |                        |
| Match reminder (day of)     | Push, SMS          | Push, SMS        | ❌ No (critical) | Must have at least one |
| Match reminder (2h before)  | Push               | Push             | ✅ Yes           |                        |
| Match updated               | Push, Email        | Push, Email      | ✅ Yes           | Time/venue changes     |
| Feedback request            | Push, Email        | Push, Email      | ✅ Yes           |                        |
| Match suggestions (weekly)  | Push, Email        | Push, Email      | ✅ Yes           |                        |

**Core notifications** (must have at least one channel enabled):

- New match invitations (essential for app functionality)
- Match cancelled (critical information)
- Day-of match reminders (critical for attendance)

### Social Notifications

Control notifications related to social interactions. For each type, players can choose which channels to receive:

| Notification Type       | Available Channels | Default Channels | Can Disable All |
| ----------------------- | ------------------ | ---------------- | --------------- |
| New chat message        | Push               | Push             | ✅ Yes          |
| Added to group          | Push               | Push             | ✅ Yes          |
| Community join approved | Push, Email        | Push, Email      | ✅ Yes          |
| Friend request          | Push               | Push             | ✅ Yes          |
| Profile view            | -                  | -                | ✅ Yes          |

### Achievement Notifications

Control notifications for achievements and gamification. For each type, players can choose which channels to receive:

| Notification Type  | Available Channels | Default Channels | Can Disable All |
| ------------------ | ------------------ | ---------------- | --------------- |
| Level certified    | Push, Email        | Push, Email      | ✅ Yes          |
| Level up           | Push, Email        | Push, Email      | ✅ Yes          |
| Badge earned       | Push, Email        | Push, Email      | ✅ Yes          |
| Most Wanted Player | Email              | Email            | ✅ Yes          |
| Streak milestone   | Push               | Push             | ✅ Yes          |

### System Notifications

Control system and account notifications. For each type, players can choose which channels to receive:

| Notification Type       | Available Channels | Default Channels | Can Disable All  |
| ----------------------- | ------------------ | ---------------- | ---------------- |
| Account security alerts | Push, Email        | Push, Email      | ❌ No (critical) |
| App updates             | Email              | Email            | ✅ Yes           |
| Feature announcements   | Email              | Email            | ✅ Yes           |
| Marketing/Tips          | Email              | Email            | ✅ Yes           |

## Quiet Hours

Set time ranges when notifications are silenced:

### Configuration

- **Enable Quiet Hours:** Toggle on/off
- **Start Time:** Select time (e.g., 10:00 PM)
- **End Time:** Select time (e.g., 7:00 AM)
- **Days:** Select which days (all week, weekdays only, weekends only, custom)

### Behavior During Quiet Hours

- **Push Notifications:** Silenced (not delivered)
- **Email Notifications:** Still sent (not affected)
- **SMS Notifications:** Silenced (not delivered)
- **Critical Alerts:** Can override quiet hours (account security, match cancellations)

### Critical Override

Some notifications bypass quiet hours:

- Match cancelled (within 24h of match time)
- Account security alerts
- System critical alerts

## Per-Conversation Settings

### Chat Notifications

- **Mute Individual Chat:** Silence notifications from specific conversation
- **Mute Duration:** 1 hour / 8 hours / 24 hours / Until unmuted
- **Mute All Chats:** Global mute for all chat notifications

### Group/Community Notifications

- **Mute Specific Group:** Silence notifications from a group
- **Mute Specific Community:** Silence notifications from a community
- **Mute All Groups:** Global mute for all group notifications

## Batching & Frequency

### Batching Rules

To avoid notification overload:

#### Auto-Generated Matches

When weekly match suggestions are generated:

- **Push:** Single summary notification (not per-match)
- **Email:** Batched into daily digest (if enabled)
- **Individual Notifications:** Can enable per-match notifications

#### Multiple Invitations

For players who receive many invitations:

- **Default:** Batch invitations in periodic summaries
- **Option:** Enable individual notifications per invitation
- **Frequency:** Summary every 4 hours / 12 hours / daily

#### Chat Messages

- **Default:** Individual push notifications per message
- **Option:** Batch messages from same conversation
- **Batch Window:** 5 minutes (messages within 5 min = single notification)

### Frequency Limits

- **Maximum Push Notifications:** 10 per hour (prevents spam)
- **Maximum Email Notifications:** 3 per day (unless critical)
- **Maximum SMS Notifications:** 2 per day (urgent only)

## Reset to Defaults

Players can reset all notification preferences to their default state with a single action.

### Reset Functionality

- **Location:** Settings → Notification Preferences → Reset to Defaults (bottom of screen)
- **Action:** Single button that resets all preferences
- **Confirmation:** Requires confirmation dialog before resetting
- **Scope:** Resets all notification preferences (channels, per-type settings, quiet hours, batching preferences)

### What Gets Reset

When resetting to defaults, the following are restored:

#### Channel Settings

- **Push Notifications:** Enabled
- **Email Notifications:** Important Only
- **SMS Notifications:** Disabled
- **Push Settings:** Sound On, Vibration On, Badge Count On

#### Quiet Hours

- **Enable Quiet Hours:** Disabled
- **Start Time:** 10:00 PM
- **End Time:** 7:00 AM
- **Days:** All Week

#### Per-Type Channel Settings

All notification types are reset to their default channels as specified in the notification type tables:

**Match Notifications:**

- New match invitation: Push ✅, Email ✅
- Match accepted: Push ✅, Email ✅
- Match declined: Push ✅
- Match cancelled: Push ✅, Email ✅, SMS ✅
- Match reminder (24h before): Push ✅, Email ✅
- Match reminder (day of): Push ✅, SMS ✅
- Match reminder (2h before): Push ✅
- Match updated: Push ✅, Email ✅
- Feedback request: Push ✅, Email ✅
- Match suggestions (weekly): Push ✅, Email ✅

**Social Notifications:**

- New chat message: Push ✅
- Added to group: Push ✅
- Community join approved: Push ✅, Email ✅
- Friend request: Push ✅

**Achievement Notifications:**

- Level certified: Push ✅, Email ✅
- Level up: Push ✅, Email ✅
- Badge earned: Push ✅, Email ✅
- Most Wanted Player: Email ✅
- Streak milestone: Push ✅

**System Notifications:**

- Account security alerts: Push ✅, Email ✅
- App updates: Email ✅
- Feature announcements: Email ✅
- Marketing/Tips: Email ✅

#### Batching Preferences

- Auto-generated matches: Batched (default)
- Multiple invitations: Batched summaries (default)
- Chat messages: Individual notifications (default)

#### Per-Conversation Mutes

- All conversation mutes are cleared
- All group/community mutes are cleared

### Reset Confirmation Dialog

When player taps "Reset to Defaults":

```
┌─────────────────────────────────────────┐
│  Reset Notification Preferences?        │
│                                         │
│  This will reset all your notification  │
│  preferences to default settings.      │
│                                         │
│  This action cannot be undone.         │
│                                         │
│  [Cancel]              [Reset to Default]│
└─────────────────────────────────────────┘
```

### After Reset

- **Immediate Effect:** All preferences are reset immediately
- **Confirmation Message:** Show success toast/alert: "Notification preferences reset to defaults"
- **No Undo:** Changes cannot be undone (player must manually reconfigure)
- **Validation:** After reset, all settings are validated to ensure they meet requirements (e.g., core notifications have at least one channel enabled)

### UX Considerations

- **Placement:** Reset button placed at bottom of screen (after all settings)
- **Visual Distinction:** Use secondary/destructive button style (e.g., outlined or red text)
- **Accessibility:** Clear label and confirmation dialog prevent accidental resets
- **Feedback:** Show immediate visual feedback when reset is complete

## Sport Context in Notifications

All notifications must indicate sport context:

### Examples

**Push Notification:**

```
🎾 [Tennis] New match invitation
Jean D. wants to play tomorrow at 3pm
```

**Email Subject:**

```
[Rallia Tennis] Match confirmed for Saturday
```

**SMS:**

```
[Rallia Tennis] Reminder: Your match with Jean is in 2 hours
```

## Notification Preferences UI

### Main Settings Screen

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
├─────────────────────────────────────────┤
│  Notification Preferences                │
│                                         │
│  ─────────────────────────────────────  │
│  Channels                               │
│  ─────────────────────────────────────  │
│  Push Notifications        [On] [Toggle]│
│  Email Notifications    [Important Only ▼]│
│  SMS Notifications          [Off] [Toggle]│
│  In-App Notifications      [Always On]   │
│                                         │
│  ─────────────────────────────────────  │
│  Quiet Hours                             │
│  ─────────────────────────────────────  │
│  Enable Quiet Hours        [On] [Toggle]│
│  Start Time:              [10:00 PM ▼]  │
│  End Time:                [7:00 AM ▼]   │
│  Days:                    [All Week ▼]  │
│                                         │
│  ─────────────────────────────────────  │
│  Match Notifications                     │
│  ─────────────────────────────────────  │
│  New invitations          [🔔📧] [Required]│
│    ↳ Push: [On] Email: [On] SMS: [-]   │
│  Match accepted           [🔔📧] [Toggle]│
│    ↳ Push: [On] Email: [On] SMS: [-]   │
│  Match declined           [🔔] [Toggle] │
│    ↳ Push: [Off] Email: [-] SMS: [-]   │
│  Match cancelled          [🔔📧📱] [Required]│
│    ↳ Push: [On] Email: [On] SMS: [On]  │
│  Match updated            [🔔📧] [Toggle]│
│    ↳ Push: [On] Email: [On] SMS: [-]   │
│  Reminder (24h before)    [🔔📧] [Toggle]│
│    ↳ Push: [On] Email: [On] SMS: [-]   │
│  Reminder (day of)        [🔔📱] [Required]│
│    ↳ Push: [On] Email: [-] SMS: [On]   │
│  Reminder (2h before)     [🔔] [Toggle] │
│    ↳ Push: [Off] Email: [-] SMS: [-]   │
│  Feedback request         [🔔📧] [Toggle]│
│    ↳ Push: [On] Email: [On] SMS: [-]   │
│                                         │
│  ─────────────────────────────────────  │
│  Social Notifications                    │
│  ─────────────────────────────────────  │
│  New chat messages        [🔔] [Toggle] │
│    ↳ Push: [On] Email: [-] SMS: [-]    │
│  Added to groups          [🔔] [Toggle] │
│    ↳ Push: [On] Email: [-] SMS: [-]    │
│  Community updates        [🔔📧] [Toggle]│
│    ↳ Push: [Off] Email: [Off] SMS: [-] │
│                                         │
│  ─────────────────────────────────────  │
│  Achievement Notifications               │
│  ─────────────────────────────────────  │
│  Level certified          [🔔📧] [Toggle]│
│    ↳ Push: [On] Email: [On] SMS: [-]   │
│  Badge earned            [🔔📧] [Toggle] │
│    ↳ Push: [On] Email: [On] SMS: [-]   │
│  Most Wanted Player       [📧] [Toggle]│
│    ↳ Push: [-] Email: [Off] SMS: [-]   │
│                                         │
│  ─────────────────────────────────────  │
│  System Notifications                    │
│  ─────────────────────────────────────  │
│  Security alerts          [🔔📧] [Required]│
│    ↳ Push: [On] Email: [On] SMS: [-]   │
│  App updates              [📧] [Toggle]│
│    ↳ Push: [-] Email: [Off] SMS: [-]   │
│  Marketing/Tips           [📧] [Toggle]│
│    ↳ Push: [-] Email: [Off] SMS: [-]   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  [Reset to Defaults]                    │
│                                         │
└─────────────────────────────────────────┘
```

### Notification Type Detail Screen

When tapping on a notification type (e.g., "New match invitation"):

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
├─────────────────────────────────────────┤
│  New Match Invitation                   │
│                                         │
│  ─────────────────────────────────────  │
│  Notification Channels                  │
│  ─────────────────────────────────────  │
│  Push Notifications      [On] [Toggle] │
│  Email Notifications     [On] [Toggle]  │
│  SMS Notifications       [-] [N/A]     │
│                                         │
│  Note: At least one channel must be     │
│  enabled for this notification type.    │
└─────────────────────────────────────────┘
```

### Channel Detail Screen

When tapping on a channel (e.g., "Push Notifications"):

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
├─────────────────────────────────────────┤
│  Push Notifications                     │
│                                         │
│  Enable Push Notifications  [On] [Toggle]│
│                                         │
│  ─────────────────────────────────────  │
│  Settings                               │
│  ─────────────────────────────────────  │
│  Notification Sound      [On] [Toggle]  │
│  Vibration              [On] [Toggle]   │
│  Badge Count            [On] [Toggle]   │
│                                         │
│  ─────────────────────────────────────  │
│  Quiet Hours                            │
│  ─────────────────────────────────────  │
│  Respect Quiet Hours     [On] [Toggle]  │
│                                         │
│  ─────────────────────────────────────  │
│  Notification Types                     │
│  ─────────────────────────────────────  │
│  [Individual toggles for each type]     │
│  (Controls which types use this channel)│
└─────────────────────────────────────────┘
```

## Validation & Constraints

### Required Settings

- At least one notification channel must be enabled globally
- Core notifications (match invitations, cancellations) must have at least one channel enabled
- Critical alerts (security, day-of reminders) must have at least one channel enabled
- If a channel is disabled globally, all notification types using that channel are automatically disabled

### Business Rules

- **Per-Type Channel Control:** Players can toggle push, email, and/or SMS for each notification type independently
- **Master Channel Toggle:** Disabling a channel globally (e.g., "Push Notifications Off") disables that channel for all notification types
- **Channel Availability:** Not all notification types support all channels (e.g., SMS only for urgent notifications)
- **Quiet Hours:** Only affect push and SMS (email always sent, but respects per-type email settings)
- **Batching Rules:** Apply automatically based on frequency
- **Per-Conversation Mutes:** Override global settings
- **Critical Notifications:** Bypass quiet hours
- **Cascading Disable:** If a player disables all channels for a notification type, that type is effectively disabled (unless it's a core/critical type, which requires at least one channel)
- **Reset to Defaults:** Resets all preferences to default state; requires confirmation; cannot be undone

## Platform-Specific Settings

### iOS

- Respects system Do Not Disturb
- Integrates with iOS notification settings
- Badge count requires permission

### Android

- Respects system Do Not Disturb
- Integrates with Android notification channels
- Can customize notification importance per type

## UX Guidelines

### Progressive Disclosure

- Show most common settings first
- Group related settings together
- Advanced settings in expandable sections

### Clear Labels

- Use clear, descriptive labels
- Indicate which settings are required vs optional
- Show current state clearly

### Immediate Feedback

- Changes apply immediately
- Show confirmation for critical changes (including reset to defaults)
- Preview notification examples
- Show success message after reset to defaults

### Mobile Optimization

- Large tap targets for toggles
- Easy scrolling between sections
- Bottom sheet modals for detailed settings

## Related Features

- [Notifications](../08-communications/notifications.md) - Notification system implementation
- [Chat](../08-communications/chat.md) - Chat notification settings
- [Match Reception](../09-matches/match-reception.md) - Match invitation notifications
