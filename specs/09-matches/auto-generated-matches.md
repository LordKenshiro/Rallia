# Auto-Generated Matches

> **Growth Hack:** Automatically generate match proposals to increase engagement.

## Overview

Once per week, the app generates match proposals based on user preferences and sends them for approval.

## Generation Process

### Trigger

- Runs once per week (day TBD, e.g., Sunday evening)
- Generates matches for the upcoming 7 days

### Generation Logic

Based on:

- User's declared availability (from onboarding)
- User's skill level
- User's location preferences
- User's match history (who they've played with)

### Target

Generate at least **5 matches per player** per week.

## Match Proposals

### Content

Each proposal includes:

- Date and time (within declared availability)
- Duration (user's preferred duration)
- Suggested recipients:
  - From favorites
  - From groups
  - From communities
  - Historical partners

### Delivery

1. Email with all proposals
2. App notification linking to proposals
3. Proposals visible in dedicated section

## User Actions

### Review Proposals

User sees all generated matches:

```
┌─────────────────────────────────────────┐
│ Weekly Match Suggestions                │
├─────────────────────────────────────────┤
│ Monday 3pm - 1h                         │
│ Suggested: Jean D., Marie L.            │
│ [Edit] [Approve] [Delete]               │
├─────────────────────────────────────────┤
│ Wednesday 6pm - 1h30                    │
│ Suggested: Tennis Addicts group         │
│ [Edit] [Approve] [Delete]               │
└─────────────────────────────────────────┘
         [Approve All] [Clear All]
```

### Edit

- Change date/time
- Change recipients
- Change duration
- Add details

### Approve

- Single match: Tap "Approve" to send
- Bulk: "Approve All" sends all matches

### Delete

- Remove proposal without sending

## Sending Approved Matches

Once approved:

- Match created and sent to recipients
- Same flow as manual match creation
- Notifications sent to recipients

## Notification Batching

To avoid spam for popular players:

- Batch approved matches in daily email
- Single summary push: "5 new match invitations"
- Continue daily until next auto-generation cycle

## Opt-Out

Users can disable auto-generation:

- Settings → Matches → Auto-generated matches: Off

## Analytics

Track:

- Number of matches generated
- Approval rate
- Matches that resulted in play
