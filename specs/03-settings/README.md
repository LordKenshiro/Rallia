# 03 - Settings

> User settings and profile management for personal information, preferences, and account configuration.

## Overview

The settings section provides players with comprehensive control over their account, profile information, preferences, and privacy settings. This is distinct from public-facing features and focuses on personal account management.

## Sub-documents

| Document                                                     | Description                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| [profile-management.md](./profile-management.md)             | Private profile management (personal info, sports, availability) |
| [notification-preferences.md](./notification-preferences.md) | Control how and when notifications are received                  |
| [permissions-management.md](./permissions-management.md)     | Manage app permissions for device features                       |
| [locale-theme.md](./locale-theme.md)                         | Language, region, date/time formats, and visual theme settings   |

## User Stories

- As a player, I want to update my personal information
- As a player, I want to manage which sports I participate in
- As a player, I want to set my availability schedule
- As a player, I want to control my privacy settings
- As a player, I want to manage my account preferences
- As a player, I want to control how I receive notifications
- As a player, I want to manage what permissions the app has
- As a player, I want to customize the app language and theme

## Dependencies

| System                                                  | Relationship                                             |
| ------------------------------------------------------- | -------------------------------------------------------- |
| [02 Sport Modes](../02-sport-modes/README.md)           | Settings respect sport context for sport-specific fields |
| [04 Player Rating](../04-player-rating/README.md)       | Manage skill levels and certification                    |
| [06 Player Directory](../06-player-directory/README.md) | Profile changes affect directory visibility              |
| [08 Communications](../08-communications/README.md)     | Notification preferences control communication channels  |
| [11 Calendar](../12-calendar/README.md)                 | Availability settings integrate with calendar            |
| [11 Courts](../11-courts/README.md)                     | Location permissions needed for court discovery          |

## Key Features

- Personal information management
- Sport-specific player attributes
- Availability schedule configuration
- Privacy and visibility controls
- Account preferences
- Notification channel management (push, email, SMS)
- App permissions control
- Locale and theme customization

## UX Suggestions

- Clear navigation between settings sections
- Inline editing for simple fields
- Dedicated screens for complex configurations
- Clear save/cancel actions
- Mobile-optimized forms
