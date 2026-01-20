# 09 - Matches

> Full match lifecycle from creation to closure.

## Overview

The match system is the core of Rallia. It enables players to create, send, accept, and complete tennis and pickleball matches.

## Sub-documents

| Document                                                 | Description                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| [match-creation.md](./match-creation.md)                 | Manual match creation process                                      |
| [auto-generated-matches.md](./auto-generated-matches.md) | Weekly automatic match suggestions                                 |
| [match-reception.md](./match-reception.md)               | How players receive match invitations                              |
| [match-lifecycle.md](./match-lifecycle.md)               | Accept, refuse, cancel flows                                       |
| [match-closure.md](./match-closure.md)                   | Feedback wizard, aggregation, reputation events, automated closure |
| [match-visualization.md](./match-visualization.md)       | Viewing matches in the app                                         |

## User Stories

- As a player, I want to create a match and invite others
- As a player, I want to receive and accept match invitations
- As a player, I want to find last-minute matches when plans change
- As a player, I want to provide feedback after a match

## Dependencies

| System                                                  | Relationship           |
| ------------------------------------------------------- | ---------------------- |
| [07 Player Relations](../07-player-relations/README.md) | Invitation recipients  |
| [08 Communications](../08-communications/README.md)     | Notifications and chat |
| [10 Club Portal](../10-club-portal/README.md)           | Court availability     |
| [11 Courts](../11-courts/README.md)                     | Court reservation      |
| [12 Calendar](../12-calendar/README.md)                 | Scheduling             |

## Match Definition

> A **match** represents a transaction between 2 players (singles) or 4 players (doubles) who agree to play under certain conditions.

## Match Types

| Type    | Players | Description      |
| ------- | ------- | ---------------- |
| Singles | 2       | One-on-one match |
| Doubles | 4       | Two-on-two match |

## Match Visibility

| Type    | Description                                      |
| ------- | ------------------------------------------------ |
| Private | Sent to specific players, groups, or communities |
| Public  | Visible to all players in the "Open Market"      |

## Key Requirements

- Match creation must be VERY fast (seconds, not minutes)
- Pre-fill from user preferences
- Clear status tracking
- Feedback collection after every match

## References

- Padel FVR, Spin for match creation UI
- Calendly for acceptance flows
