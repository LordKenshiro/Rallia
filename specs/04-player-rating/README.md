# 04 - Player Rating

> Skill level management using NTRP (Tennis) and DUPR (Pickleball) scales.

## Overview

The player rating system evaluates and tracks player skill levels. It uses industry-standard scales and includes certification mechanisms to ensure accuracy.

## Sub-documents

| Document                                             | Description                           |
| ---------------------------------------------------- | ------------------------------------- |
| [level-scales.md](./level-scales.md)                 | NTRP and DUPR rating scales explained |
| [level-initialization.md](./level-initialization.md) | Self-declaration during onboarding    |
| [level-certification.md](./level-certification.md)   | Peer referencing and proof submission |
| [level-evolution.md](./level-evolution.md)           | How levels change over time           |

## User Stories

- As a new player, I want to self-declare my skill level so I can find appropriate opponents
- As an experienced player, I want to certify my level so others trust my rating
- As a player, I want my level to evolve based on my performance

## Dependencies

| System                                              | Relationship                        |
| --------------------------------------------------- | ----------------------------------- |
| [01 Authentication](../01-authentication/README.md) | Initial level set during onboarding |
| [08 Matches](../09-matches/README.md)               | Post-match feedback affects level   |
| [12 Gamification](../13-gamification/README.md)     | Level certification badge           |

## Rating Scales

| Sport      | Scale                                      | Range     |
| ---------- | ------------------------------------------ | --------- |
| Tennis     | NTRP (National Tennis Rating Program)      | 1.0 - 7.0 |
| Pickleball | DUPR (Dynamic Universal Pickleball Rating) | 2.0 - 8.0 |

## Key Concepts

### Self-Declared Level

Initial rating set by player during onboarding using a self-assessment grid.

### Certified Level

Level verified through:

- Peer references (3 certified players of same or higher level)
- Proof submission (videos, tournament results, external ratings)

### Level Badge

Visual indicator showing certification status:

- No badge: Self-declared only
- Certified badge: Verified through references or proof

## Open Questions

- Should we integrate with external rating systems (UTR, official DUPR)?
- How to handle disputes about player levels?
