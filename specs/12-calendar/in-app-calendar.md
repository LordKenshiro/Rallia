# In-App Calendar

## Overview

Built-in calendar for visualizing matches and scheduling.

## Calendar Views

### Weekly View (Primary)

Default view showing 7 days:

- Optimized for mobile screen
- One week visible at a glance
- Scroll left/right for other weeks
- Time slots: 30-minute increments

```
┌─────────────────────────────────────────┐
│ ← Week of Jan 6-12, 2026 →              │
├─────────────────────────────────────────┤
│      Mon  Tue  Wed  Thu  Fri  Sat  Sun  │
│ 8am                        [Match]      │
│ 9am                         ...         │
│ 10am      [Invite]                      │
│ 11am                                    │
│ 12pm [Match]                            │
│ 1pm   ...                               │
│ 2pm                             [Court] │
│ ...                                     │
└─────────────────────────────────────────┘
```

### Daily View

Detailed view of a single day:

- Tappable from weekly view
- Full time slot details
- More room for event information

### Responsive Design

Adjust based on device:

- Mobile: Week view with horizontal scroll
- Tablet: Full week visible
- Desktop: Week or month view

## Calendar Items

### Match (Accepted)

| Property | Display                                                |
| -------- | ------------------------------------------------------ |
| Color    | Sport-specific (blue for Tennis, green for Pickleball) |
| Style    | Solid background                                       |
| Content  | Opponent name, time, location                          |
| Actions  | Tap to view details                                    |

### Match Invitation (Pending)

| Property | Display                              |
| -------- | ------------------------------------ |
| Color    | Lighter/muted version of sport color |
| Style    | Dashed border                        |
| Content  | "Invitation from [Name]"             |
| Actions  | Tap to respond                       |

### Court Booking

| Property | Display               |
| -------- | --------------------- |
| Color    | Neutral (gray/purple) |
| Style    | Solid                 |
| Content  | Court name, time      |
| Actions  | Tap to view           |

## Creating Matches from Calendar

### Quick Create

1. Tap on empty time slot
2. "Create Match" dialog opens
3. Date/time pre-filled
4. Continue to match creation form

Similar to creating a meeting in Outlook Calendar.

## Viewing Other Calendars

### Player Calendars

When viewing another player's profile:

- If calendar is public: See their calendar
- If calendar is private: "Calendar not available"
- Helps find mutual availability

### Calendar Visibility Settings

| Setting      | Who Can See               |
| ------------ | ------------------------- |
| Public       | Anyone                    |
| Friends Only | Favorites + group members |
| Private      | Only me                   |

Settings → Privacy → Calendar Visibility

## Navigation

- Swipe left/right: Previous/next week
- Tap date: Jump to that day
- "Today" button: Return to current week
- Date picker: Jump to specific date

## Sport Separation

Calendars are unified but sport-coded:

- Both Tennis and Pickleball matches visible
- Colored differently per sport
- Filter option: Show Tennis only / Pickleball only / Both
