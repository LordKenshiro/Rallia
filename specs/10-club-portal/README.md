# 10 - Club Portal

> B2B interface for private clubs to manage court availability and bookings.

## Overview

The Club Portal allows private tennis and pickleball clubs to list their courts for reservation by Rallia users. This is a separate interface from the player app.

## Sub-documents

| Document                                                   | Description                       |
| ---------------------------------------------------------- | --------------------------------- |
| [club-profiles.md](./club-profiles.md)                     | Club account creation and profile |
| [availability-management.md](./availability-management.md) | Managing court availability       |
| [booking-management.md](./booking-management.md)           | Viewing and managing reservations |
| [club-analytics.md](./club-analytics.md)                   | Performance metrics for clubs     |

## User Stories

- As a club manager, I want to list my courts for Rallia users to book
- As a club manager, I want to manage court availability easily
- As a club manager, I want to see booking analytics
- As a club manager, I want to handle cancellations and no-shows

## Dependencies

| System                                | Relationship                              |
| ------------------------------------- | ----------------------------------------- |
| [10 Courts](../11-courts/README.md)   | Clubs provide inventory for court booking |
| [08 Matches](../09-matches/README.md) | Players book courts for matches           |

## Scope

### Short-Term (MVP)

Simple system:

- Display court details and prices
- Accept bookings
- Manage cancellations
- Payment handled outside app

### Long-Term

Integrated club management:

- In-app payments
- Full calendar management
- Member management
- Similar to Playtomic

## Key Features

| Feature               | Description                          |
| --------------------- | ------------------------------------ |
| Club Profile          | Visible to players searching courts  |
| Availability Calendar | Set available time slots and pricing |
| Booking Dashboard     | View and manage reservations         |
| Analytics             | Track utilization and revenue        |
| Player Blocking       | Block problematic players            |

## Separate Authentication

Clubs have their own authentication:

- Email + Password
- Or social login (Facebook, Google, Apple)
- Different from player accounts
