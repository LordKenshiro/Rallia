# Booking Management

## Overview

Clubs view and manage all reservations made through Rallia.

## Booking Dashboard

### List View

```
┌─────────────────────────────────────────┐
│ Today's Bookings (5)                    │
├─────────────────────────────────────────┤
│ 9:00 AM  Court 1  Jean Dupont   $30     │
│ 10:00 AM Court 2  Marie L.      $30     │
│ 2:00 PM  Court 1  Pierre M.     $25     │
│ 4:00 PM  Court 3  Tennis Group  $25     │
│ 6:00 PM  Court 1  Sarah K.      $35     │
└─────────────────────────────────────────┘
```

### Filters

| Filter | Options                            |
| ------ | ---------------------------------- |
| Date   | Today, Tomorrow, This week, Custom |
| Court  | All, Specific court                |
| Sport  | Tennis, Pickleball                 |
| Status | Upcoming, Completed, Cancelled     |

## Booking Details

Click on booking to see:

- Player name
- Contact info
- Court and time
- Price
- Booking date
- Actions available

## Actions

### Cancel Booking

1. Club selects booking
2. Clicks "Cancel Reservation"
3. Selects reason
4. Confirms
5. Player notified
6. Slot reopens for booking

### Mark No-Show

At booking closure time:

1. Club marks if player showed up
2. If no-show, recorded for analytics
3. Consider: Impact on player reputation?

## Automatic Closure

At scheduled end time:

- Booking auto-closed
- Slot becomes available for next booking
- Club can mark no-show if applicable

## Notifications

Clubs receive notifications:

- New booking made
- Booking cancelled by player
- Booking reminder (optional)

Players receive notifications:

- Booking confirmed
- Booking cancelled by club
- Reminder before booking

## Cancellation Policies

Clubs set their own policies:

- Free cancellation period (e.g., 24h before)
- Cancellation fee (if payment integrated)
- No-show policy

Currently: Policies displayed as text, not enforced by system.
Future: Automated enforcement with payment integration.

## Player Blocking

Clubs can block problematic players:

1. View player's booking history
2. Click "Block Player"
3. Set duration: Temporary or Permanent
4. Blocked player cannot book at this club
