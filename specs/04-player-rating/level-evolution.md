# Level Evolution

## Overview

Player levels can change over time through player request or automatic adjustment based on references from certified players.

## Level Change Methods

### 1. Player-Requested Change

Players can request to change their level at any time.

#### Level Increase Request

| Action               | Consequence                  |
| -------------------- | ---------------------------- |
| Request higher level | Loses all references         |
|                      | Loses certification badge    |
|                      | Must re-certify at new level |

#### Level Decrease Request

| Action              | Consequence                       |
| ------------------- | --------------------------------- |
| Request lower level | Keeps all references              |
|                     | Keeps certification badge         |
|                     | Badge now shows new (lower) level |

### 2. Automatic Adjustment

Based on references from certified players that suggest a different level than the player's current declared level.

**Note:** References that confirm the current level count toward certification but do not affect level evolution. Only references that suggest a different level (0.5 higher or lower) are considered for automatic adjustment.

#### Calculation: Moving Average of Last 5 Level Suggestions (M5)

```
Current Level: 4.0
Recent Level Suggestions: [4.0, 4.0, 4.5, 4.5, 4.5]
Average: 4.3
```

#### Adjustment Rules

| Condition                      | Action           |
| ------------------------------ | ---------------- |
| M5 is 0.5+ above current level | Upgrade by 0.5   |
| M5 is 0.5+ below current level | Downgrade by 0.5 |
| M5 is within ±0.5 of current   | No change        |

#### Extreme Suggestion Filter

> **Important:** Any reference suggestion that is 1.0 or more different from the player's current level is excluded from the M5 calculation.

This prevents:

- Vindictive low suggestions
- Overly generous high suggestions
- Gaming the system

### Certification After Automatic Change

| Change Type         | Certification Status |
| ------------------- | -------------------- |
| Automatic upgrade   | Kept at new level    |
| Automatic downgrade | Kept at new level    |

## Level History

Track all level changes for analytics:

```json
{
  "history": [
    { "date": "2025-01-01", "level": 3.5, "reason": "initial" },
    { "date": "2025-03-15", "level": 4.0, "reason": "player_request" },
    { "date": "2025-06-20", "level": 4.0, "reason": "certified" },
    { "date": "2025-09-01", "level": 4.5, "reason": "auto_upgrade" }
  ]
}
```

## Notifications

| Event                  | Notification                                       |
| ---------------------- | -------------------------------------------------- |
| Level upgraded         | "Congratulations! You've been upgraded to [level]" |
| Level downgraded       | "Your level has been adjusted to [level]"          |
| Certification achieved | "Your level is now certified!"                     |
| Certification lost     | "Your certification has been reset"                |
