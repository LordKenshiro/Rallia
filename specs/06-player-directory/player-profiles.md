# Player Profiles

## Overview

Each player has a public profile viewable by other players in the same sport universe.

## Profile Information

### Always Visible

| Field         | Description                                         |
| ------------- | --------------------------------------------------- |
| Name          | First name (last name initial optional)             |
| Profile Photo | If uploaded                                         |
| Skill Level   | NTRP or DUPR with certification badge if applicable |
| Reputation    | Percentage gauge (or "New" if < 3 matches)          |
| Location      | City/area (not exact address)                       |
| Member Since  | When they joined                                    |

### Conditionally Visible

| Field                 | Visibility Controlled By  |
| --------------------- | ------------------------- |
| Calendar              | Player's privacy settings |
| Availability Schedule | Player's privacy settings |
| Full Name             | Player's privacy settings |
| Phone Number          | Never public              |
| Email                 | Never public              |

### Badges Displayed

| Badge                | Criteria                                |
| -------------------- | --------------------------------------- |
| Certified Level      | Level verified through references/proof |
| High Reputation      | Reputation ≥ 90%                        |
| Most Wanted Player   | Certified + High Reputation             |
| Frequently Available | Often has open availability             |

### Game Attributes

| Attribute                | Description                    |
| ------------------------ | ------------------------------ |
| Playing Style            | e.g., Baseline, Serve & Volley |
| Handedness               | Right/Left                     |
| Preferred Match Duration | 30min, 1h, 1h30, 2h            |
| Match Interest           | Match, Practice, or Both       |

### Proof of Level

If player has submitted proof (videos, links), display:

- Links to external profiles (UTR, DUPR, Tennis Canada)
- Tournament history links
- Video links

## Profile Actions

When viewing another player's profile:

| Action           | Description                                    |
| ---------------- | ---------------------------------------------- |
| Invite to Play   | Start match creation with this player selected |
| Add to Favorites | Add to favorites list                          |
| Message          | Open chat (if applicable)                      |
| Block            | Block this player                              |
| Report           | Report inappropriate behavior                  |

## Profile Card (List View)

Compact view for directory listings:

```
┌─────────────────────────────────────────┐
│ [Photo]  Jean D.           NTRP 4.0 ✓  │
│          Montreal • 3km    Rep: 92% ⭐  │
│          🎾 Baseline • Right-handed    │
└─────────────────────────────────────────┘
```

## Profile Page (Full View)

Full profile with all public information:

```
┌─────────────────────────────────────────┐
│              [Large Photo]              │
│                                         │
│            Jean Dupont                  │
│         Montreal, QC • 3km              │
│                                         │
│  Level: NTRP 4.0 ✓     Rep: 92% ⭐      │
│  [=========>  ]        [=========>  ]   │
│                                         │
│  ─────────────────────────────────────  │
│  Playing Style: Baseline                │
│  Handedness: Right                      │
│  Preferred Duration: 1h - 1h30          │
│  Looking for: Matches & Practice        │
│                                         │
│  [Invite to Play] [Add to Favorites]    │
│                                         │
│  ─────────────────────────────────────  │
│  Calendar (Public)                      │
│  [Weekly calendar view]                 │
└─────────────────────────────────────────┘
```
