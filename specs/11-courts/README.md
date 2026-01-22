# 11 - Courts

> Court discovery and reservation for players.

## Overview

The courts system helps players find and reserve courts for their matches, integrating with external reservation systems and Rallia's club portal.

## Sub-documents

| Document                                               | Description                               |
| ------------------------------------------------------ | ----------------------------------------- |
| [court-discovery.md](./court-discovery.md)             | Finding courts near you                   |
| [external-integrations.md](./external-integrations.md) | Integration with external booking systems |
| [in-app-booking.md](./in-app-booking.md)               | Booking courts within the app             |

## User Stories

- As a player, I want to find courts near me
- As a player, I want to see court availability
- As a player, I want to book a court without leaving the app
- As a player, I want to save my favorite courts

## Dependencies

| System                                        | Relationship                               |
| --------------------------------------------- | ------------------------------------------ |
| [08 Matches](../09-matches/README.md)         | Match creation triggers court booking flow |
| [09 Club Portal](../10-club-portal/README.md) | Private clubs list courts here             |

## Court Sources

| Source                  | Type                          | Integration       |
| ----------------------- | ----------------------------- | ----------------- |
| Rallia Clubs            | Private clubs via Club Portal | Native            |
| Loisirs Montréal        | Public courts                 | API integration   |
| Other municipal systems | Public courts                 | API integration   |
| Unregistered courts     | Any                           | Info display only |

## Coverage Goals

Initial target cities:

- Greater Montreal
- Greater Toronto
- Greater Vancouver
- Ottawa-Gatineau
- Calgary
- Edmonton
- Quebec City

## Key Principle

> **Goal:** Take users as far as possible in the booking process without leaving the app. Ideally complete the entire booking in-app.

## References

- Spin app for court booking integration
- Playyourcourt for court information display
