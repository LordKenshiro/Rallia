# Notifications

## Overview

Multi-channel notification system for match updates, messages, and system alerts.

## Notification Channels

| Channel | Use Case                 | Timing               |
| ------- | ------------------------ | -------------------- |
| Push    | Real-time alerts         | Immediate            |
| Email   | Confirmations, summaries | Immediate or batched |
| SMS     | Urgent reminders         | Immediate            |
| In-App  | All notifications        | When app is open     |

## Notification Types

### Match Notifications

| Event                   | Push | Email | SMS      |
| ----------------------- | ---- | ----- | -------- |
| New match invitation    | ✅   | ✅    | Optional |
| Match accepted          | ✅   | ✅    | -        |
| Match declined          | ✅   | -     | -        |
| Match cancelled         | ✅   | ✅    | ✅       |
| Match reminder (24h)    | ✅   | ✅    | -        |
| Match reminder (day of) | ✅   | -     | ✅       |
| Feedback request        | ✅   | ✅    | -        |

### Social Notifications

| Event                   | Push | Email | SMS |
| ----------------------- | ---- | ----- | --- |
| New message             | ✅   | -     | -   |
| Added to group          | ✅   | -     | -   |
| Community join approved | ✅   | ✅    | -   |
| Level certified         | ✅   | ✅    | -   |
| Badge earned            | ✅   | ✅    | -   |

### System Notifications

| Event                    | Push | Email | SMS |
| ------------------------ | ---- | ----- | --- |
| Weekly match suggestions | ✅   | ✅    | -   |
| New Most Wanted Players  | -    | ✅    | -   |
| Account updates          | -    | ✅    | -   |

## Sport Context

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

## Notification Preferences

Users can control notifications:

### Global Settings

| Setting             | Options                    |
| ------------------- | -------------------------- |
| Push Notifications  | On / Off                   |
| Email Notifications | All / Important Only / Off |
| SMS Notifications   | On / Off                   |
| Quiet Hours         | Set time range             |

### Per-Type Settings

| Type              | Can Disable                |
| ----------------- | -------------------------- |
| Match invitations | ❌ No (core functionality) |
| Match reminders   | ✅ Yes                     |
| Chat messages     | ✅ Yes                     |
| Marketing/Tips    | ✅ Yes                     |
| System alerts     | ❌ No                      |

### Per-Conversation Settings

- Mute individual chats
- Mute specific groups/communities

## Batching

To avoid notification overload:

### Auto-Generated Matches

When weekly match suggestions are generated:

- Batch into single daily email
- Single push with summary
- Not individual notifications per match

### Popular Players

Players who receive many invitations:

- Batch invitations in periodic summaries
- Option to enable individual notifications

## Match Reminders

| Timing          | Channel         | Content                     |
| --------------- | --------------- | --------------------------- |
| 24 hours before | Push + Email    | Full match details          |
| Day of match    | Push + SMS      | Time and location reminder  |
| 2 hours before  | Push (optional) | "Get ready for your match!" |

## Technical Notes

- Use FCM for Android push
- Use APNs for iOS push
- Email via transactional service (SendGrid, etc.)
- SMS via Twilio or similar
