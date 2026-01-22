# Availability Management

## Overview

Clubs manage when their courts are available for booking through Rallia.

## Availability Calendar

### Calendar View

Calendar interface showing:

- 1-hour time slots
- All courts in columns
- Days/weeks in rows
- Color-coded availability status

```
┌─────────────────────────────────────────┐
│         Court 1   Court 2   Court 3     │
├─────────────────────────────────────────┤
│ 8:00    [Avail]   [Booked]  [Avail]    │
│ 9:00    [Avail]   [Avail]   [Blocked]  │
│ 10:00   [Booked]  [Avail]   [Avail]    │
│ 11:00   [Avail]   [Avail]   [Avail]    │
│ ...                                     │
└─────────────────────────────────────────┘
```

### Slot States

| State     | Description        | Color |
| --------- | ------------------ | ----- |
| Available | Can be booked      | Green |
| Booked    | Reserved by player | Blue  |
| Blocked   | Not available      | Gray  |

## Setting Availability

### Single Slot

1. Click on a time slot
2. Set as Available or Blocked
3. If Available, set price

### Bulk Entry

1. Select date range
2. Select courts
3. Select time range
4. Set number of courts available
5. Set price per hour
6. Save

### Recurring Availability

Set weekly recurring patterns:

- "Every weekday, 7am-9pm, all courts available"
- "Weekends, 8am-6pm, courts 1-3 available"

## Pricing

### Per-Slot Pricing

Each available slot has:

- Price per hour (CAD)
- Can vary by:
  - Time of day
  - Day of week
  - Court

### Price Examples

| Time     | Weekday | Weekend |
| -------- | ------- | ------- |
| 7am-12pm | $30/hr  | $40/hr  |
| 12pm-5pm | $25/hr  | $35/hr  |
| 5pm-10pm | $35/hr  | $45/hr  |

## Consistency with Bookings

When modifying availability:

- Cannot block already-booked slots
- Must cancel booking first (with notification)
- System prevents conflicts

## Sport Separation

Separate availability for:

- Tennis courts
- Pickleball courts

Same interface, filtered by sport.
