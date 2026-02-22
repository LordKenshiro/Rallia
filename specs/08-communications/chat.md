# Chat

## Overview

In-app messaging between players, groups, and communities.

## Chat Types

### 1. Match Chat

Created when a match is mutually accepted.

| Property     | Value                                      |
| ------------ | ------------------------------------------ |
| Participants | 2 players (singles) or 4 players (doubles) |
| Created When | Match accepted                             |
| Expires      | Configurable (e.g., 48h after match ends)  |

### 2. Group Chat

Automatically created with each group.

| Property     | Value                      |
| ------------ | -------------------------- |
| Participants | All group members (max 10) |
| Created When | Group created              |
| Persists     | Until group deleted        |

### 3. Community Chat

Automatically created with each community.

| Property     | Value                   |
| ------------ | ----------------------- |
| Participants | All community members   |
| Created When | Community created       |
| Persists     | Until community deleted |

## Chat Features

### Basic Features

| Feature            | Supported         |
| ------------------ | ----------------- |
| Text messages      | ✅ Yes            |
| Read receipts      | ✅ Yes (optional) |
| Typing indicators  | ✅ Yes            |
| Message timestamps | ✅ Yes            |

### Enhanced Features

| Feature          | Supported | Notes                       |
| ---------------- | --------- | --------------------------- |
| Reactions        | ✅ Yes    | 👍, 🎾, 🏓, etc.            |
| Quick replies    | ✅ Yes    | Pre-written common messages |
| Images           | Consider  | May add complexity          |
| Location sharing | Consider  | Useful for court meetups    |

### Quick Replies

Pre-written messages for common scenarios:

- "On my way!"
- "Running 5 minutes late"
- "I'm at the court"
- "See you there!"
- "Need to reschedule"

## Blocking in Chat

When a player blocks another:

- Existing conversation hidden
- Cannot send new messages
- Blocked user doesn't know they're blocked

See [Blocking](../07-player-relations/blocking.md).

## Chat Moderation

### Automatic Moderation

- Filter inappropriate language
- Flag suspicious patterns
- See [Moderation](./moderation.md)

### User Actions

| Action | Description                      |
| ------ | -------------------------------- |
| Block  | Block user and hide conversation |
| Report | Report conversation to admins    |
| Mute   | Mute notifications for this chat |
| Leave  | Leave group/community chat       |

## Chat UI

### Conversation List

```
┌─────────────────────────────────────────┐
│ Messages                                │
├─────────────────────────────────────────┤
│ [Photo] Match with Jean D.    2 min ago │
│         "See you at 3pm!"               │
│                                         │
│ [Icon]  Tennis Addicts        1 hour    │
│         Marie: "Anyone free..."         │
│                                         │
│ [Photo] Pierre M.             Yesterday │
│         "Great match!"                  │
└─────────────────────────────────────────┘
```

### Chat View

Standard chat interface with:

- Messages left/right aligned
- Timestamps
- Reactions below messages
- Quick reply bar
- Text input at bottom

## Notifications

Chat messages trigger notifications:

- Push notification for new messages
- Badge count on messages tab
- Can mute individual conversations
