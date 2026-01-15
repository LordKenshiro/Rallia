# Last-Minute Matches

## Overview

Feature for finding matches within the next 24 hours, useful when:

- A planned match gets cancelled
- Player has sudden free time
- Looking for immediate play opportunities

## Access Points

### Automatic Prompt

When a user's match is cancelled at the last minute:

1. Show cancellation notification
2. Immediately offer: "Find a last-minute match?"
3. One tap to view available matches

### Manual Access

Dedicated "Last Minute" section or filter:

- In Open Market: Quick filter for "Next 24 hours"
- Dedicated button: "Play Now" or "Last Minute"

## Last-Minute View

```
┌─────────────────────────────────────────┐
│ ⚡ Last Minute Matches                  │
│ Matches in the next 24 hours            │
├─────────────────────────────────────────┤
│ In 2 hours • Parc Jarry                 │
│ Jean D. • NTRP 4.0 • Court Reserved ✓   │
│ [Quick Join]                            │
├─────────────────────────────────────────┤
│ Today 6pm • Club Downtown               │
│ Marie L. • NTRP 3.5 • Practice          │
│ [Quick Join]                            │
├─────────────────────────────────────────┤
│ Tomorrow 8am • Outremont                │
│ Looking for doubles partner             │
│ [View Details]                          │
└─────────────────────────────────────────┘
```

## Features

### Time Priority

Sort by soonest first - players looking for last-minute typically want the earliest option.

### Quick Join

Simplified acceptance flow:

1. Tap "Quick Join"
2. Immediate confirmation (skip approval if auto-accept)
3. Chat opens

### Court Status Priority

Prioritize matches with courts already reserved - more likely to happen.

## Creating Last-Minute Matches

When creating a match for today or tomorrow:

- Automatically tagged as "Last Minute"
- Higher visibility in last-minute section
- Consider push notification to nearby players

## Notifications

### For Cancelled Matches

When someone's match is cancelled < 24h before:

```
Your match was cancelled.
⚡ Find a replacement match?
[See Available Matches]
```

### For New Last-Minute Matches

Optional: Push to players who have marked themselves as "Available Now"

- Players can enable "Looking for last-minute" status
- Receive notifications for new matches in their area

## "Available Now" Status (Future)

Let players indicate immediate availability:

1. Toggle "I'm free now" in app
2. Set duration (1h, 2h, etc.)
3. Set location/radius
4. Receive notifications for matching opportunities
5. Status auto-expires

This creates a more active matching system for spontaneous play.
