# 07 - Player Relations

> Managing relationships with other players: favorites, groups, communities, and blocking.

## Overview

The player relations system allows users to organize their network of players for easier match invitations and communication.

## Sub-documents

| Document                               | Description                    |
| -------------------------------------- | ------------------------------ |
| [favorites.md](./favorites.md)         | Favorites list management      |
| [private-lists.md](./private-lists.md) | Lists for non-app users        |
| [groups.md](./groups.md)               | Small private groups (max 10)  |
| [communities.md](./communities.md)     | Larger semi-public communities |
| [blocking.md](./blocking.md)           | Blocking players               |

## User Stories

- As a player, I want to add favorite players for quick match invitations
- As a player, I want to create a list of friends not yet on the app
- As a player, I want to create a private group with my regular playing partners
- As a player, I want to join communities to find more players
- As a player, I want to block someone who is bothering me

## Dependencies

| System                                                  | Relationship                                                |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| [05 Player Directory](../06-player-directory/README.md) | Source for adding players to lists                          |
| [07 Communications](../08-communications/README.md)     | Groups and communities have associated chats                |
| [08 Matches](../09-matches/README.md)                   | Lists, groups, and communities are match invitation targets |

## Relationship Types

| Type          | Max Size   | Visibility                      | Moderation                    |
| ------------- | ---------- | ------------------------------- | ----------------------------- |
| Favorites     | Unlimited  | Private to user                 | N/A                           |
| Private Lists | Unlimited  | Private to user                 | N/A                           |
| Groups        | 10 players | Members only                    | Creator + assigned moderators |
| Communities   | Unlimited  | Public listing, private content | Creator + assigned moderators |

## Key Concepts

### Favorites

Players you prefer to play with. Quick access for match invitations.

### Private Lists

Contact lists for people NOT on the app. Used to invite non-users to matches.

### Groups

Small private circles of players who regularly play together.

### Communities

Larger, discoverable groups like "Tennis Addicts" or "Downtown Pickleball".

## Reference

- WhatsApp for group/community moderation patterns
- RacketPal for community front pages
