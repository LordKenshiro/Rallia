# 06 - Player Directory

> Browse, search, and view player profiles within the current sport universe.

## Overview

The player directory allows users to discover other players on the platform. It respects the current sport context and provides filtering and search capabilities.

## Sub-documents

| Document                                       | Description                     |
| ---------------------------------------------- | ------------------------------- |
| [player-profiles.md](./player-profiles.md)     | What's shown on player profiles |
| [search-filtering.md](./search-filtering.md)   | Search and filter capabilities  |
| [player-visibility.md](./player-visibility.md) | Privacy and visibility settings |

## User Stories

- As a player, I want to browse other players to find potential opponents
- As a player, I want to filter by skill level to find compatible matches
- As a player, I want to view a player's profile before inviting them to play
- As a player, I want to find players near me geographically

## Dependencies

| System                                                  | Relationship                           |
| ------------------------------------------------------- | -------------------------------------- |
| [02 Sport Modes](../02-sport-modes/README.md)           | Directory is filtered by current sport |
| [04 Player Rating](../04-player-rating/README.md)       | Shows player skill levels              |
| [05 Reputation](../05-reputation/README.md)             | Shows player reputation                |
| [07 Player Relations](../07-player-relations/README.md) | Actions: add to favorites, block       |

## Key Features

- Full access to all players in current sport universe
- Filter by multiple criteria
- View public profile information
- View public calendar (if player has enabled)
- Quick actions: invite to play, add to favorites, message

## UX Suggestions

- Display visual badges (certified level, high reputation, frequent availability)
- Add interactive map view to see nearby players
- Show compatibility indicators based on preferences
