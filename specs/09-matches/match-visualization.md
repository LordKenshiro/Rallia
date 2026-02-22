# Match Visualization

## Overview

How users view and browse matches in the mobile app. Match visualization is split across three main screens:

1. **Home Screen** — Quick access to user's upcoming matches and nearby public matches
2. **Player Matches Screen** — Full view of all user's matches (upcoming and past)
3. **Public Matches Screen** — Browsable/searchable list of all joinable public matches

## Home Screen

The home screen provides a quick overview with two main sections for authenticated users.

### My Matches Section

A horizontal scrollable carousel showing the user's upcoming matches (limited to 5).

```
┌─────────────────────────────────────────────┐
│ My Matches                      [View All >]│
├─────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │ Match 1 │ │ Match 2 │ │ Match 3 │  →      │
│ │ Today   │ │ Tomorrow│ │ Sat 10am│         │
│ └─────────┘ └─────────┘ └─────────┘         │
└─────────────────────────────────────────────┘
```

**Features:**

- Horizontal scroll with compact match cards (`MyMatchCard`)
- Shows date/time prominently
- "View All" button navigates to Player Matches screen
- Empty state shown when user has no upcoming matches

### Soon & Nearby Section

A vertical list of public matches near the user's location.

```
┌─────────────────────────────────────────────┐
│ Soon & Nearby                   [View All >]│
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Tomorrow 3pm • Jean D. • NTRP 4.0      │ │
│ │ Parc Jarry • 2.3 km • Singles          │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ Saturday 10am • Marie L. • NTRP 3.5    │ │
│ │ Club XYZ • 4.1 km • Doubles            │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Features:**

- Uses player's `maxTravelDistanceKm` preference for filtering
- Filters out matches where user is creator or participant
- "View All" button navigates to Public Matches screen
- Infinite scroll with pagination
- Pull-to-refresh support

### Unauthenticated User View

Non-authenticated users see:

- Sign-in prompt card instead of My Matches section
- Soon & Nearby section still visible (encouraging engagement)

## Player Matches Screen

Dedicated screen for viewing all of the user's matches with tabbed navigation.

### Tab Structure

```
┌─────────────────────────────────────────────┐
│ ┌─────────────┐ ┌─────────────┐             │
│ │  Upcoming   │ │    Past     │             │
│ └─────────────┘ └─────────────┘             │
├─────────────────────────────────────────────┤
│ TODAY                                       │
│ ─────────────────────────────────────────── │
│ 3:00 PM • Jean D. • Singles                 │
│ Parc Jarry • 1h                             │
│ ─────────────────────────────────────────── │
│ TOMORROW                                    │
│ ─────────────────────────────────────────── │
│ 10:00 AM • Pierre M. • Doubles              │
│ Club XYZ • 2h                               │
├─────────────────────────────────────────────┤
│ THIS WEEK                                   │
│ ...                                         │
└─────────────────────────────────────────────┘
```

### Date Sections

Matches are grouped into intuitive date sections:

**Upcoming Tab Sections:**
| Section | Description |
|---------|-------------|
| Today | Matches scheduled for today |
| Tomorrow | Matches scheduled for tomorrow |
| This Week | Within the next 7 days |
| Next Week | Within the next 14 days |
| Later | Beyond 14 days |

**Past Tab Sections:**
| Section | Description |
|---------|-------------|
| Today | Matches that ended earlier today |
| Yesterday | Matches from yesterday |
| Last Week | Within the past 7 days |
| Earlier | Beyond 7 days ago |

**Past Match Display:**

- Completed matches show feedback status (pending feedback, feedback submitted)
- Closed matches show aggregated star ratings (your rating, their rating)
- Mutually cancelled matches show "Cancelled" badge
- See [Match Closure](./match-closure.md) for the post-match UI specification

### Features

- **SectionList** with sticky section headers (optional)
- **Infinite scroll** with pagination (20 matches per page)
- **Pull-to-refresh** for updating match data
- **Empty states** with appropriate icons and messaging
- **Match cards** open detail sheet on tap

## Public Matches Screen

Full browsing experience for discovering joinable public matches.

### Search & Filter UI

```
┌─────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────┐ │
│ │ 🔍 Search matches...                  ✕ │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ ┌─────┐ ┌───────┐ ┌─────┐ ┌────────┐  →    │
│ │Reset│ │ All   │ │Today│ │ Morning│       │
│ │ (3) │ │ 5km   │ │     │ │        │       │
│ └─────┘ └───────┘ └─────┘ └────────┘       │
├─────────────────────────────────────────────┤
│ 12 matches found                            │
├─────────────────────────────────────────────┤
│ [Match Cards...]                            │
└─────────────────────────────────────────────┘
```

### Filter Options

Filters are displayed as horizontally scrollable chip groups:

| Filter          | Options                                   | Default |
| --------------- | ----------------------------------------- | ------- |
| **Distance**    | All, 2 km, 5 km, 10 km                    | All     |
| **Date Range**  | All, Today, This Week, This Weekend       | All     |
| **Time of Day** | All, Morning ☀️, Afternoon ⛅, Evening 🌙 | All     |
| **Format**      | All, Singles, Doubles                     | All     |
| **Match Type**  | All, Casual, Competitive                  | All     |
| **Skill Level** | All, Beginner, Intermediate, Advanced     | All     |
| **Gender**      | All, Male, Female                         | All     |
| **Cost**        | All, Free ✓, Paid 💵                      | All     |
| **Join Mode**   | All, Direct, Request                      | All     |

### Filter Features

- **Active filter indicator**: Dot appears next to filter group labels when non-default value selected
- **Reset button**: Appears when any filter is active, shows count of active filters
- **Debounced search**: 300ms delay on search input to prevent excessive API calls
- **Results count**: Shows number of matches found (singular/plural form)
- **Loading indicator**: Shown during search/filter updates

### Match Filtering Logic

The following matches are excluded from results:

- Matches created by the current user
- Matches where the user is already a participant

### Empty States

| State                     | Icon | Message                                              |
| ------------------------- | ---- | ---------------------------------------------------- |
| No matches (with filters) | 🔍   | "No matches found" + suggestion to adjust filters    |
| No matches (no filters)   | 🎾   | "No matches available" + encouragement to create one |

### Features

- **Search bar** with real-time filtering
- **Filter chips** with grouped organization and horizontal scroll
- **Edge fade gradient** indicating scrollable filter area
- **Infinite scroll** with pagination
- **Pull-to-refresh** for updating data
- **Results count** display
- **Haptic feedback** on filter interactions

## Match Card Display

All screens use the `MatchCard` component showing:

- **Creator info**: Name, avatar, skill level
- **Schedule**: Date and time
- **Location**: Facility name and distance from user
- **Format**: Singles/Doubles indicator
- **Match type**: Casual/Competitive badge
- **Participant count**: Spots filled vs. available

The Home screen's My Matches section uses a compact `MyMatchCard` variant optimized for horizontal display.

## Match Detail Sheet

When a match card is tapped, a bottom sheet opens showing comprehensive match information and available actions.

### Layout

```
┌─────────────────────────────────────────────┐
│ ─────  (handle indicator)                   │
├─────────────────────────────────────────────┤
│ 📅 Today • 14:00 - 16:00              [✕]  │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ ⏳ Your request is pending approval     │ │  ← Status banner (conditional)
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ [Court Booked ✓] [Competitive 🏆] [4.0+]   │  ← Match badges
├─────────────────────────────────────────────┤
│ 👥 Participants (2/4)                       │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐                         │
│ │⭐│ │👤│ │+ │ │+ │  ← Avatars with host badge
│ └──┘ └──┘ └──┘ └──┘                         │
│ Jean  Marc                                  │
│ 2 spots left                                │
├─────────────────────────────────────────────┤
│ 📍 Parc Jarry - Court 3                  >  │  ← Tappable, opens maps
│    123 Main St, Montreal                    │
│    2.3 km away                              │
├─────────────────────────────────────────────┤
│ 💵 Estimated Cost                           │
│    $5 per person                            │
├─────────────────────────────────────────────┤
│ 📝 Notes                                    │
│    "Looking for rally practice"             │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────┐ ┌────┐      │
│ │        Join Now             │ │ ↗️ │      │  ← Sticky footer
│ └─────────────────────────────┘ └────┘      │
└─────────────────────────────────────────────┘
```

### Match Badges

Displayed when applicable:

| Badge                 | Condition                              | Color             |
| --------------------- | -------------------------------------- | ----------------- |
| Court Booked ✓        | `court_status === 'reserved'`          | Secondary (coral) |
| Competitive 🏆        | `player_expectation === 'competitive'` | Accent (amber)    |
| Casual 😊             | `player_expectation === 'casual'`      | Primary (teal)    |
| Skill Level           | `min_rating_score` set                 | Primary (teal)    |
| Men Only / Women Only | `preferred_opponent_gender` set        | Neutral           |
| Request to Join       | `join_mode === 'request'`              | Neutral           |
| Public / Private      | Visibility (shown to creator only)     | Primary/Neutral   |

### Participants Section

- **Avatar grid**: Shows host (with ⭐ badge), joined participants, and empty slots (with + icon)
- **Names**: First name displayed under each avatar
- **Spots indicator**: "2 spots left" or "1 spot left"

#### For Match Hosts

Additional management features:

**Pending Requests** (when `join_mode === 'request'`):

- List of players requesting to join
- Each shows: avatar, name, skill rating
- Actions: View Details 👁️, Accept ✓, Reject ✗
- "Match full" indicator when no spots available
- Collapsible when > 3 requests

**Invitations Sent**:

- List of invited players (pending and declined)
- Status badge: "Pending" or "Declined"
- Actions: Resend 🔄, Cancel ✗

**Kick Participant**:

- Remove button on each participant avatar (not host)

### Status Banners

Contextual banners shown at top of sheet:

| User State               | Banner Message                     | Color           |
| ------------------------ | ---------------------------------- | --------------- |
| Pending request          | "Your request is pending approval" | Warning (amber) |
| Waitlisted (match full)  | "You're on the waitlist"           | Info (blue)     |
| Waitlisted (spot opened) | "A spot opened up! Join now"       | Success (green) |

### Action Buttons

The footer shows context-appropriate actions:

| User Role         | Match State  | Primary Action      | Secondary    |
| ----------------- | ------------ | ------------------- | ------------ |
| Creator           | Active       | Edit                | Cancel Match |
| Participant       | Active       | Leave Match         | —            |
| Pending requester | Active       | Cancel Request      | —            |
| Waitlisted        | Full         | Leave Waitlist      | —            |
| Waitlisted        | Spot open    | Join Now / Request  | —            |
| Non-participant   | Open spots   | Join Now            | —            |
| Non-participant   | Request mode | Request to Join     | —            |
| Non-participant   | Full         | Join Waitlist       | —            |
| Anyone            | In Progress  | "Match in progress" | —            |
| Participant       | Completed    | Give Feedback       | —            |
| Anyone            | Completed    | "Match completed"   | —            |
| Anyone            | Closed       | View Results        | —            |
| Anyone            | Cancelled    | "Match cancelled"   | —            |

**Share Button**: Always visible, allows sharing match details.

**Feedback Button** (Completed matches only):

- Shown to participants when match status is `completed` AND `feedback_completed = false`
- Hidden when `feedback_completed = true` or match is `closed`
- Opens the Feedback Wizard modal
- See [Match Closure](./match-closure.md) for the feedback wizard flow

### Confirmation Modals

Destructive actions require confirmation:

- **Leave Match**: "Are you sure you want to leave?"
- **Cancel Match**: "This will notify X participants"
- **Reject Request**: "Reject this player's request?"
- **Kick Participant**: "Remove this player from the match?"
- **Cancel Invitation**: "Cancel this invitation?"
- **Cancel Request**: "Cancel your join request?"

### Location Integration

- Tapping the location row opens native maps app
- Uses coordinates when available, falls back to address search
- Platform-specific URL schemes (iOS Maps, Google Maps on Android)

### Technical Details

- **Component**: `MatchDetailSheet` (bottom sheet modal)
- **Snap point**: 95% screen height
- **Hook**: `useMatchActions` for all match operations
- **State updates**: Optimistic UI with server confirmation
- **Haptic feedback**: On all user interactions

## Navigation Flow

```
Home Screen
├── My Matches Section
│   ├── [Match Card] → Match Detail Sheet
│   └── [View All] → Player Matches Screen
├── Soon & Nearby Section
│   ├── [Match Card] → Match Detail Sheet
│   └── [View All] → Public Matches Screen
│
Player Matches Screen
├── [Tab: Upcoming | Past]
└── [Match Card] → Match Detail Sheet
│
Public Matches Screen
├── [Search & Filters]
└── [Match Card] → Match Detail Sheet
│
Match Detail Sheet (Modal)
├── [Join/Request/Leave] → Action with confirmation
├── [Edit] → Match Creation Wizard (edit mode)
├── [Location] → Native Maps App
└── [Share] → System Share Sheet
```

## Technical Implementation

### Data Fetching

| Screen/Component   | Hook               | Key Parameters                                  |
| ------------------ | ------------------ | ----------------------------------------------- |
| Home (My Matches)  | `usePlayerMatches` | `timeFilter: 'upcoming'`, `limit: 5`            |
| Home (Nearby)      | `useNearbyMatches` | `maxDistanceKm`, `sportId`, `userGender`        |
| Player Matches     | `usePlayerMatches` | `timeFilter: 'upcoming' \| 'past'`, `limit: 20` |
| Public Matches     | `usePublicMatches` | All filter params, `debouncedSearchQuery`       |
| Match Detail Sheet | `useMatchActions`  | `matchId`, action callbacks                     |

### Match Actions

The `useMatchActions` hook provides all match operations:

| Action         | Method                                     | Description                      |
| -------------- | ------------------------------------------ | -------------------------------- |
| Join           | `joinMatch(playerId)`                      | Join directly or request to join |
| Leave          | `leaveMatch(playerId)`                     | Leave the match                  |
| Cancel         | `cancelMatch(playerId)`                    | Cancel match (host only)         |
| Accept Request | `acceptRequest({participantId, hostId})`   | Accept join request              |
| Reject Request | `rejectRequest({participantId, hostId})`   | Reject join request              |
| Cancel Request | `cancelRequest(playerId)`                  | Cancel own join request          |
| Kick           | `kickParticipant({participantId, hostId})` | Remove participant               |
| Cancel Invite  | `cancelInvite({participantId, hostId})`    | Cancel pending invitation        |
| Resend Invite  | `resendInvite({participantId, hostId})`    | Resend invitation                |

### Pagination

All list screens support infinite scroll:

- Initial page size: 20 matches
- `onEndReached` threshold: 0.3 (30% from bottom)
- Loading indicator shown during page fetch

### Refresh

All screens support pull-to-refresh:

- Uses React Native's `RefreshControl`
- `isRefetching` state controls spinner visibility
- Themed spinner colors (primary brand color)

### Context Providers

| Context                   | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `MatchDetailSheetContext` | Manages sheet open/close state and selected match |
| `ActionsSheetContext`     | Opens match creation wizard (for edit mode)       |

### UI Components

| Component               | Library                | Usage                                       |
| ----------------------- | ---------------------- | ------------------------------------------- |
| `BottomSheetModal`      | `@gorhom/bottom-sheet` | Match detail sheet                          |
| `ConfirmationModal`     | Custom                 | Destructive action confirmations            |
| `RequesterDetailsModal` | Custom                 | View requester profile before accept/reject |
