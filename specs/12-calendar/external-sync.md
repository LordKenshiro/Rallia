# External Calendar Sync

## Overview

Integration with Google Calendar and Apple Calendar for match management.

## Sync Methods

### Calendar File (ICS)

When a match is confirmed:

- Email includes .ics calendar attachment
- User can add to any calendar app

### Direct Integration (Future)

Bidirectional sync with Google/Apple:

- Matches automatically added to external calendar
- Changes in Rallia reflected in external calendar
- Potential: Read external calendar to show busy times

## ICS File Content

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Rallia//Match//EN
BEGIN:VEVENT
DTSTART:20260110T150000
DTEND:20260110T160000
SUMMARY:[Tennis] Match with Jean Dupont
DESCRIPTION:Tennis match at Parc Jarry Tennis Courts
LOCATION:Parc Jarry Tennis Courts, 1234 Rue Jarry, Montreal
ORGANIZER:mailto:match@rallia.app
END:VEVENT
END:VCALENDAR
```

## Email Integration

### Confirmation Email

When match is accepted:

```
Subject: [Rallia Tennis] Match Confirmed - Jan 10, 3pm

Hi [Name],

Your match is confirmed!

📅 Saturday, January 10, 2026
⏰ 3:00 PM - 4:00 PM
📍 Parc Jarry Tennis Courts
🎾 Match with Jean Dupont

[Add to Calendar]  <-- Button to download ICS

See you on the court!
```

## One-Tap Add to Calendar

### Mobile Behavior

When user taps "Add to Calendar":

- iOS: Opens default calendar with event pre-filled
- Android: Opens calendar chooser, then pre-fills event

### Supported Calendars

| Calendar        | Support             |
| --------------- | ------------------- |
| Apple Calendar  | ✅ ICS + deep link  |
| Google Calendar | ✅ ICS + web link   |
| Outlook         | ✅ ICS              |
| Other           | ✅ ICS (manual add) |

## Bidirectional Sync (Future)

### Connecting Calendar

1. Settings → Calendar → Connect External Calendar
2. Choose Google or Apple
3. Authorize access
4. Calendar connected

### Sync Behavior

| Action in Rallia | External Calendar |
| ---------------- | ----------------- |
| Match confirmed  | Event created     |
| Match cancelled  | Event deleted     |
| Time changed     | Event updated     |

| Action in External | Rallia                                 |
| ------------------ | -------------------------------------- |
| Event deleted      | Notify user, ask to cancel match       |
| Time changed       | Not synced (Rallia is source of truth) |

### Availability Import (Future)

Read external calendar to:

- Show busy times when creating matches
- Auto-decline conflicts
- Suggest available times

## Privacy

- Only share necessary info in calendar events
- Don't include sensitive profile data
- Opponent name and contact only visible to participants
