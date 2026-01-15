# 12 - Calendar

> In-app calendar and external calendar synchronization.

## Overview

The calendar system provides a visual overview of matches and allows integration with external calendars like Google and Apple Calendar.

## Sub-documents

| Document                                   | Description                       |
| ------------------------------------------ | --------------------------------- |
| [in-app-calendar.md](./in-app-calendar.md) | Built-in calendar functionality   |
| [external-sync.md](./external-sync.md)     | Google/Apple Calendar integration |
| [reminders.md](./reminders.md)             | Match reminders and notifications |

## User Stories

- As a player, I want to see all my matches in a calendar view
- As a player, I want to create matches directly from the calendar
- As a player, I want my matches synced to my phone calendar
- As a player, I want reminders before my matches

## Dependencies

| System                                              | Relationship                  |
| --------------------------------------------------- | ----------------------------- |
| [08 Matches](../09-matches/README.md)               | Matches displayed in calendar |
| [10 Courts](../11-courts/README.md)                 | Court bookings in calendar    |
| [07 Communications](../08-communications/README.md) | Reminder notifications        |

## Design Philosophy

> Simple, not ultra-sophisticated. Focus on visualization and quick match creation.

## Key Features

| Feature       | Description                          |
| ------------- | ------------------------------------ |
| Weekly View   | See 7 days at a glance               |
| Match Display | Accepted and pending matches visible |
| Quick Create  | Create match from calendar slot      |
| External Sync | Add matches to Google/Apple Calendar |
| Reminders     | Day-before and day-of reminders      |

## Calendar Visibility

Players can set their calendar visibility:

- Public: Anyone can see availability
- Friends Only: Favorites and group members
- Private: Only visible to user

## References

- Booking Stade IGA for calendar UX
- Padel FVR for match visualization
