# In-App Booking

## Overview

Complete court reservation flow within the Rallia app.

## Booking Flow

### From Match Creation

After creating a match without a reserved court:

1. "Reserve a court now?" prompt
2. User taps "Yes"
3. Court discovery opens, filtered by:
   - Match location
   - Match date/time
   - Match duration

### Direct Court Booking

From Courts section:

1. Find court
2. View availability
3. Select time slot
4. Complete booking

## Availability View

```
┌─────────────────────────────────────────┐
│ Parc Jarry - Court 1                    │
│ Saturday, January 10                    │
├─────────────────────────────────────────┤
│ 8:00 AM   [Available] $0                │
│ 9:00 AM   [Available] $0                │
│ 10:00 AM  [Booked]                      │
│ 11:00 AM  [Available] $0                │
│ 12:00 PM  [Available] $0                │
│ 1:00 PM   [Available] $0                │
│ ...                                     │
└─────────────────────────────────────────┘
```

## Booking Confirmation

### Summary Screen

```
┌─────────────────────────────────────────┐
│ Confirm Booking                         │
├─────────────────────────────────────────┤
│ 📍 Parc Jarry Tennis Courts             │
│    Court 1                              │
│                                         │
│ 📅 Saturday, January 10                 │
│ ⏰ 10:00 AM - 11:00 AM                  │
│                                         │
│ 💰 Free                                 │
│                                         │
│ [Cancel]  [Confirm Booking]             │
└─────────────────────────────────────────┘
```

### Confirmation

After booking:

- Success message
- Added to calendar
- Email confirmation (with calendar file)
- Option to link to match

## Calendar Integration

### Auto-Link to Match

If booking from match:

- Court automatically linked to match
- Match status updates to "Court Reserved"

### Manual Link

If booking independently:

- Offer to create match for this slot
- Or link to existing pending match

## Cancellation

### From Rallia

If system supports:

1. View booking in "My Bookings"
2. Tap "Cancel"
3. Confirm cancellation
4. Calendar updated
5. Court freed up

### Policy Enforcement

For club courts:

- Show club's cancellation policy
- Warn about fees if applicable

## Notifications

| Event             | Notification                |
| ----------------- | --------------------------- |
| Booking confirmed | Push + Email with calendar  |
| Booking reminder  | Push, day before and day of |
| Booking cancelled | Push + Email                |

## My Bookings

View all reservations:

```
┌─────────────────────────────────────────┐
│ My Court Bookings                       │
├─────────────────────────────────────────┤
│ UPCOMING                                │
│ ─────────────────────────────────────── │
│ Sat Jan 10, 10am • Parc Jarry           │
│ Match with Jean D.                      │
│ [View] [Cancel]                         │
├─────────────────────────────────────────┤
│ PAST                                    │
│ ─────────────────────────────────────── │
│ Mon Jan 5, 4pm • Club XYZ               │
│ [View Details]                          │
└─────────────────────────────────────────┘
```
