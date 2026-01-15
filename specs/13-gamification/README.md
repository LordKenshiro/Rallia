# 13 - Gamification

> Badges, achievements, and engagement mechanics.

## Overview

The gamification system rewards players for positive behaviors and achievements, encouraging engagement and quality interactions.

## Sub-documents

| Document                                         | Description                                          |
| ------------------------------------------------ | ---------------------------------------------------- |
| [level-badges.md](./level-badges.md)             | Skill level certification badges                     |
| [reputation-badges.md](./reputation-badges.md)   | Reliability and conduct badges                       |
| [most-wanted-player.md](./most-wanted-player.md) | The super-badge combining certification + reputation |
| [match-badges.md](./match-badges.md)             | Match-specific badges                                |

## User Stories

- As a player, I want to earn badges for my achievements
- As a player, I want to see badges on other players' profiles
- As a certified player, I want recognition for my verified skill level
- As a reliable player, I want to be recognized with the Most Wanted Player badge

## Dependencies

| System                                            | Relationship              |
| ------------------------------------------------- | ------------------------- |
| [03 Player Rating](../04-player-rating/README.md) | Level certification badge |
| [04 Reputation](../05-reputation/README.md)       | High reputation badge     |
| [08 Matches](../09-matches/README.md)             | Match badges              |

## Badge Hierarchy

```
┌─────────────────────────────────────────┐
│           MOST WANTED PLAYER            │
│              (Super-Badge)              │
│                   ⬆️                     │
│     ┌─────────────┴─────────────┐       │
│     │                           │       │
│ Certified Level    +    High Reputation │
│     Badge                  Badge        │
└─────────────────────────────────────────┘
```

## Badge Categories

| Category    | Badges                          |
| ----------- | ------------------------------- |
| Skill       | Certified Level                 |
| Reliability | High Reputation                 |
| Status      | Most Wanted Player              |
| Match       | Ready to Play, Most Wanted Game |
| Activity    | (Future: Frequent Player, etc.) |

## Badge Display

Badges appear on:

- Player profiles
- Search results
- Match cards
- Player cards in groups/communities
