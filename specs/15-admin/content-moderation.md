# Content Moderation

## Overview

Handling user reports and content violations.

## Moderation Queue

### Dashboard

```
┌─────────────────────────────────────────┐
│ Moderation Queue (15 pending)           │
├─────────────────────────────────────────┤
│ 🔴 High Priority (3)                    │
│ 🟡 Medium Priority (7)                  │
│ 🟢 Low Priority (5)                     │
├─────────────────────────────────────────┤
│ [Match Report] Jean D. → Pierre M.      │
│ Match: Jan 10, 2026 • Tennis Singles    │
│ Reason: Safety concern                  │
│ 1 hour ago                              │
│ [Review]                                │
├─────────────────────────────────────────┤
│ [Chat Report] Marie L. → Paul T.        │
│ Reason: Harassment                      │
│ 2 hours ago                             │
│ [Review]                                │
├─────────────────────────────────────────┤
│ [Profile Report] Sophie K.              │
│ Reason: Inappropriate photo             │
│ 5 hours ago                             │
│ [Review]                                │
└─────────────────────────────────────────┘
```

### Priority Assignment

| Priority | Criteria                                      |
| -------- | --------------------------------------------- |
| High     | Threats, severe harassment, safety concerns   |
| Medium   | Inappropriate content, spam, multiple reports |
| Low      | Minor violations, single reports              |

## Report Review

### View Report

For each report, admin sees:

- Reporter information
- Reported user information
- Content in question (message, profile, etc.)
- Report reason and details
- Previous reports involving either party
- Action history

### Moderation Actions

| Action         | Description                   |
| -------------- | ----------------------------- |
| Dismiss        | No violation found            |
| Warn           | Send warning to reported user |
| Remove Content | Delete offending content      |
| Suspend        | Temporary account suspension  |
| Ban            | Permanent account removal     |

### Response to Reporter

After action:

- Reporter optionally notified of outcome
- "Thank you for reporting. We've taken action."
- Details of action not disclosed

## Proactive Moderation

### Automated Flags

System automatically flags:

- Messages with blocked words
- Unusual patterns (mass messaging, spam)
- High volume of reports on a user
- New accounts with suspicious behavior

### Manual Review

Admins can browse:

- Recent chat messages
- New user profiles
- Public match listings

## Content Types

### Chat Messages

- View message content
- View conversation context
- Delete specific messages
- Block user from chat

### Profile Content

- Photos
- Bio/description
- Proof submissions (for level)

### Match Listings

- Public match descriptions
- Additional details field

### Match Reports

Reports submitted during post-match feedback (see [Match Closure](../09-matches/match-closure.md)):

- View match details (date, time, sport, participants)
- View report reason and details
- View associated feedback (star rating, comments)
- Access reporter and reported player profiles
- Priority auto-assigned based on reason (safety = high, misrepresented level = low)

## Moderation Guidelines

Documented guidelines for:

- What constitutes harassment
- Inappropriate content definitions
- Escalation procedures
- Consistency in enforcement
