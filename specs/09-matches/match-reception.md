# Match Reception

## Overview

How players receive and view match invitations.

## Notification Delivery

### Private Matches (Individual)

Sent immediately via:

- Push notification
- Email
- SMS (optional)

### Private Matches (Group/Community)

Sent immediately to all members via:

- Push notification
- Email

### Auto-Generated Matches (Batched)

If approved in bulk:

- Daily summary email
- Single push notification with count
- Batched until next auto-generation cycle

## Receiving Preferences

### Limit Senders

Players can control who can send them matches:

| Setting            | Can Receive From                      |
| ------------------ | ------------------------------------- |
| Everyone           | All app users                         |
| Favorites & Groups | Only favorites and group members      |
| Custom             | Specific players, groups, communities |

Settings → Privacy → Match Invitations

## Viewing Invitations

### Invitations List

Dedicated section for pending invitations:

```
┌─────────────────────────────────────────┐
│ Match Invitations (3)                   │
├─────────────────────────────────────────┤
│ 🎾 Jean D.                              │
│ Tomorrow 3pm • Parc Jarry • 1h          │
│ NTRP 4.0 ✓ • Rep 92%                    │
│ [Accept] [Decline]                      │
├─────────────────────────────────────────┤
│ 🎾 Tennis Addicts                       │
│ Saturday 10am • TBD • 2h                │
│ Doubles • 3 spots open                  │
│ [View Details]                          │
└─────────────────────────────────────────┘
```

### In Calendar

Pending invitations also appear in calendar:

- Different visual style (dashed border, lighter color)
- Tappable to view details and respond

### Invitation Expiration

Invitations **do not expire**. A `pending` invitation remains pending until:

- The player accepts or declines
- The host cancels the invitation
- The match start time passes (invitation becomes moot)

**Rationale:** Players may not check the app frequently. Expiring invitations could cause missed opportunities and frustration.

## Non-App User Reception

When non-users receive invitations (from private lists):

### SMS/Email Content

```
Jean D. invites you to play tennis!

📅 Saturday, January 10 at 3pm
📍 Parc Jarry Tennis Courts
⏱️ 1 hour

[Accept] [Decline]

Don't have Rallia? It's free!
[Download App]
```

### Acceptance Flow for Non-Users

1. Tap "Accept" in SMS/email
2. Redirected to web form
3. Provide: Name, Email, Phone
4. Receive confirmation email with calendar file
5. Prompted to download app

> **Growth Hack:** This converts non-users to leads.

## Match Card Details

When viewing a match invitation:

```
┌─────────────────────────────────────────┐
│ Match Invitation                        │
├─────────────────────────────────────────┤
│ From: Jean Dupont                       │
│ NTRP 4.0 ✓ • Reputation 92% ⭐          │
│                                         │
│ 📅 Saturday, January 10, 2026           │
│ ⏰ 3:00 PM - 4:00 PM                    │
│ 📍 Parc Jarry Tennis Courts             │
│ 🎾 Singles • Match                      │
│                                         │
│ Court Status: Reserved (Free)           │
│                                         │
│ "Looking for a competitive match!"      │
│                                         │
│ [Accept]  [Decline]  [Message]          │
└─────────────────────────────────────────┘
```
