# Reminders

## Overview

Automated reminders to help players prepare for matches.

## Reminder Schedule

| Timing          | Channel         | Content            |
| --------------- | --------------- | ------------------ |
| 24 hours before | Push + Email    | Full match details |
| Day of match    | Push + SMS      | Time and location  |
| 2 hours before  | Push (optional) | "Get ready!"       |

## Reminder Content

### 24-Hour Reminder (Email)

```
Subject: [Rallia Tennis] Match Tomorrow at 3pm

Hi [Name],

Don't forget your match tomorrow!

📅 Saturday, January 10, 2026
⏰ 3:00 PM - 4:00 PM
📍 Parc Jarry Tennis Courts
🎾 Match with Jean Dupont

Jean's contact: [if shared]

[View Match] [Get Directions] [Cancel Match]

See you on the court!
```

### 24-Hour Reminder (Push)

```
🎾 Match Tomorrow at 3pm
with Jean D. at Parc Jarry
```

### Day-of Reminder (SMS)

```
[Rallia Tennis] Reminder: Your match with Jean D.
is today at 3pm at Parc Jarry Tennis Courts.
```

### 2-Hour Reminder (Push)

```
🎾 Get ready!
Match in 2 hours at Parc Jarry
```

## Reminder Preferences

### Global Settings

Settings → Notifications → Match Reminders

| Setting         | Options | Default |
| --------------- | ------- | ------- |
| 24h reminder    | On/Off  | On      |
| Day-of reminder | On/Off  | On      |
| 2h reminder     | On/Off  | Off     |

### Per-Match Override

Future: Allow customizing reminders per match.

## Smart Reminders (Future)

### Traffic-Aware

"Leave now to arrive on time!"

- Based on current location
- Traffic conditions
- Estimated travel time

### Weather Alert

"It's going to rain at 3pm - confirm match?"

- Check weather forecast
- Alert if outdoor court + bad weather predicted

## Reminder Logic

### Only for Confirmed Matches

Reminders sent only when:

- Match is accepted by both parties
- Match is not cancelled
- Match time hasn't passed

### No Duplicates

- One reminder per timing window
- Don't re-send if user has already viewed match

## Action Buttons

Reminders include quick actions:

- View Match → Open match details
- Get Directions → Open maps
- Message Partner → Open chat
- Cancel → Cancel match (with confirmation)
