# Profile Management

## Overview

The private profile management section allows players to view and edit their personal information, player attributes, sports participation, and availability schedules. This is distinct from the public profile view that others see.

## Access

- **Location:** Settings → Edit Profile (or direct access from profile icon)
- **Access Control:** Only the player can access their own profile management
- **Sport Context:** Profile management is unified across sports, but some fields are sport-specific

## Sections

### 1. Personal Information

#### Editable Fields

| Field         | Description  | Validation                    | Visibility Impact              |
| ------------- | ------------ | ----------------------------- | ------------------------------ |
| Full Name     | Required     | 1-100 characters              | Controlled by privacy settings |
| Username      | Required     | 3-30 characters, alphanumeric | Always visible to others       |
| Email         | Required     | Valid email format            | Never visible to others        |
| Date of Birth | Optional     | Valid date format             | Controlled by privacy settings |
| Gender        | Optional     | Predefined options            | Controlled by privacy settings |
| Phone Number  | Optional     | Valid phone format            | Never visible to others        |
| Bio           | Optional     | Max 500 characters            | Visible if provided            |
| Profile Photo | Image upload | Max 5MB, square recommended   | Visible if uploaded            |

**Note:** Email cannot be modified after account creation.

#### Profile Photo Management

- Upload new photo
- Crop/rotate before saving
- Remove photo (reverts to default avatar)
- Preview how it appears to others

### 2. Player Information

These attributes are shared across all sports:

- **Preferred Playing Hand:** Right, Left, Ambidextrous
- **Maximum Travel Distance:** Distance willing to travel for matches (e.g., discrete slider scale up to 50km)

### 3. Sport Rating (Sport-Specific Screen)

**Access:** Navigate to sport-specific screen from main profile → select active sport

Each sport (Tennis/Pickleball) has separate rating information displayed on the sport-specific screen:

**Rating Section Display:**

- **References count:** Number of references received
- **Rating Proofs count:** Number of rating proofs submitted

**Actions:**

- **Request Reference button:** Opens bottom sheet to select players to request references from
- **Manage Rating Proofs button:** Navigates to dedicated rating proof management screen

**Rating Proof Management Screen:**

This screen is dedicated solely to managing rating proofs:

- View proof submissions (videos, links)
- Add new proof of level
- Delete existing proof submissions

**Important:** Player references and rating proofs are linked to specific rating scores. When updating self-declared rating:

- If upgrading to a level for which the player has no previous references or rating proofs, display an alert warning that current references and rating proofs may not apply to the new level
- Alert message: "Your current references and rating proofs are linked to your previous level. They may not apply to your new level. Consider obtaining new references or submitting new proof for your updated level."
- Allow player to proceed with the update or cancel to maintain current level

### 4. Sport Preferences (Sport-Specific Screen)

**Access:** Navigate to sport-specific screen from main profile → select active sport

Each sport (Tennis/Pickleball) has separate preferences managed via bottom sheet on the sport-specific screen:

**Tennis Preferences:**

- Playing Style: Baseline, Serve & Volley, All-Court, etc.
- Game Duration: 30min, 1h, 1h30, 2h
- Game Type: Matches, Practice, Both
- Preferred Facility: Select from available facilities

**Pickleball Preferences:**

- Playing Style: Power, Control, Mixed, etc.
- Game Duration: 30min, 1h, 1h30, 2h
- Game Type: Matches, Practice, Both
- Preferred Facility: Select from available facilities

### 5. Sports Management

#### Sports List (Main Profile Screen)

Display which sports the player participates in:

| Sport      | Status            | Navigation                               |
| ---------- | ----------------- | ---------------------------------------- |
| Tennis     | Active / Inactive | Tap to navigate to sport-specific screen |
| Pickleball | Active / Inactive | Tap to navigate to sport-specific screen |

#### Navigating to Sport-Specific Screen

- Tapping on a sport (active or inactive) navigates to that sport's dedicated screen
- Active sports show rating and preferences sections
- Inactive sports show activation question ("Do you play [Sport]?")

#### Activating a Sport

1. Navigate to inactive sport's screen
2. See "Do you play [Sport]?" question
3. Select "Yes" to activate:
   - Sport becomes active
   - Screen updates to show rating and preferences sections
   - Initialize with default attributes
   - Prompt for skill level (self-assessment)
4. Select "No" to keep inactive

#### Deactivating a Sport

1. Navigate to active sport's screen
2. Select "No" to deactivate:
3. If deactivated:
   - Profile hidden in that sport's directory
   - Historical matches remain visible
   - Can reactivate later by selecting "Yes" on the sport screen

### 6. Availability Management

#### Personal Availability Schedule

Players can set their general availability patterns for match invitations using simple time-of-day toggles.

#### Weekly Availability Pattern

Set recurring weekly availability by toggling AM (morning), PM (afternoon), and/or EVE (evening) for each weekday:

```
┌─────────────────────────────────────────┐
│  My Availability                        │
├─────────────────────────────────────────┤
│         AM    PM    EVE                 │
│  Mon    [✓]   [✓]   [ ]                 │
│  Tue    [✓]   [✓]   [✓]                 │
│  Wed    [ ]    [✓]   [✓]                 │
│  Thu    [✓]   [✓]   [✓]                 │
│  Fri    [✓]   [✓]   [ ]                 │
│  Sat    [ ]    [✓]   [✓]                 │
│  Sun    [ ]    [✓]   [✓]                 │
└─────────────────────────────────────────┘
```

- Time periods: AM (morning), PM (afternoon), EVE (evening)
- Toggle each time period independently for each weekday
- Multiple time periods can be selected per day (e.g., AM + PM)

#### Availability Visibility

Control who can see your availability:

| Setting      | Who Can See                              |
| ------------ | ---------------------------------------- |
| Public       | Anyone viewing your profile              |
| Friends Only | Favorites + group members                |
| Private      | Only you (but can still receive invites) |

Default: Private

#### Integration with Calendar

- Availability schedule informs match creation suggestions
- When creating matches, show times when both players are available
- Availability ≠ booked time (matches are separate)

## Profile Management UI

### Main Profile Screen

The main profile screen shows unified information and provides access to sport-specific screens:

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
├─────────────────────────────────────────┤
│  [Photo]                                 │
│  [Edit Photo]                            │
│                                         │
│  ─────────────────────────────────────  │
│  Personal Information        [Edit]     │
│  ─────────────────────────────────────  │
│  Full Name: Jean Dupont                  │
│  Username: @jeandupont                   │
│  Email: jean@example.com (read-only)     │
│  DOB: 1990-05-15                        │
│  Gender: Male                            │
│  Phone: +1 514-555-1234                  │
│                                         │
│  ─────────────────────────────────────  │
│  Player Information          [Edit]     │
│  ─────────────────────────────────────  │
│  Bio: I love playing tennis...          │
│  Preferred Hand: Right                  │
│  Max Travel: 25km                       │
│                                         │
│  ─────────────────────────────────────  │
│  Sports                                 │
│  ─────────────────────────────────────  │
│  Tennis: [Active ✓]                  >  │
│  Pickleball: [Inactive]              >  │
│                                         │
│  ─────────────────────────────────────  │
│  Availability                [Edit]     │
│  ─────────────────────────────────────  │
│  Mon: AM, PM                             │
│  Tue: AM, PM, EVE                        │
│  Wed: PM, EVE                            │
│  ...                                     │
│  Visibility: Private                     │
└─────────────────────────────────────────┘
```

### Sport-Specific Screen (Active Sport)

When a sport is active, tapping on it navigates to the sport-specific screen:

```
┌─────────────────────────────────────────┐
│  ← Back                    Tennis      │
├─────────────────────────────────────────┤
│                                         │
│  ─────────────────────────────────────  │
│  Rating                                 │
│  ─────────────────────────────────────  │
│  References: 3                           │
│  Rating Proofs: 2                       │
│                                         │
│  [Request Reference]                    │
│  [Manage Rating Proofs]                 │
│                                         │
│  ─────────────────────────────────────  │
│  Sport Preferences          [Edit]     │
│  ─────────────────────────────────────  │
│  Playing Style: Baseline                 │
│  Game Duration: 1h - 1h30               │
│  Game Type: Matches & Practice          │
│  Preferred Facility: Club ABC           │
└─────────────────────────────────────────┘
```

### Sport-Specific Screen (Inactive Sport)

When a sport is inactive, the screen shows only activation options:

```
┌─────────────────────────────────────────┐
│  ← Back                 Pickleball     │
├─────────────────────────────────────────┤
│                                         │
│  Do you play Pickleball?               │
│                                         │
│  [Yes]  [No ✓]                         │
│                                         │
└─────────────────────────────────────────┘
```

### Edit Mode

Editing is done via bottom sheets on the main profile screen, with each section group having its own edit button:

- **Personal Information** - Opens bottom sheet with: Full Name, Username, Email (read-only), DOB, Gender, Phone
- **Player Information** - Opens bottom sheet with: Bio, Preferred Playing Hand, Maximum Travel Distance
- **Availability** - Opens bottom sheet with: Weekly availability pattern (AM/PM/EVE toggles), Visibility settings

Each bottom sheet:

- Slides up from the bottom of the screen
- Contains all fields for that section
- Has Save and Cancel buttons
- Saves changes when Save is tapped
- Discards changes when Cancel is tapped or sheet is dismissed
- Validates fields before saving

### Sport-Specific Screen Actions

On the sport-specific screen:

- **Request Reference** - Opens bottom sheet to select players to request references from
- **Manage Rating Proofs** - Navigates to dedicated rating proof management screen
- **Sport Preferences [Edit]** - Opens bottom sheet with: Playing Style, Game Duration, Game Type, Preferred Facility

### Sport Activation

When activating an inactive sport:

- User sees "Do you play [Sport]?" question
- Selecting "Yes" activates the sport and navigates to the active sport screen
- Selecting "No" keeps the sport inactive

## Validation & Constraints

### Required Fields

- Full Name
- Username
- Email (set at account creation, cannot be modified)
- At least one active sport
- Skill level for each active sport

### Field Limits

- Full Name: 1-100 characters
- Username: 3-30 characters, alphanumeric (may include underscores/hyphens)
- Email: Valid email format (read-only after account creation)
- Bio: Max 500 characters
- Phone: Valid phone format (if provided)
- Profile photo: Max 5MB, recommended square
- Maximum Travel Distance: Valid distance value

### Business Rules

- Cannot remove last active sport
- Availability changes don't affect existing matches
- Email cannot be modified after account creation
- Preferred playing hand and maximum travel distance are shared across all sports
- Player references and rating proofs are linked to specific rating scores
- When updating self-declared rating to a level without existing references/proofs, player must be alerted before proceeding

## Privacy Integration

Profile management integrates with privacy settings:

- Changes to name visibility affect what others see immediately
- Bio visibility controlled by privacy settings
- Calendar visibility controls availability schedule visibility
- Profile visibility toggle affects directory appearance

See [Player Visibility](../06-player-directory/player-visibility.md) for details.

## Sport Context

### Unified vs Sport-Specific

| Section              | Behavior                                        |
| -------------------- | ----------------------------------------------- |
| Personal Information | Unified (same across sports)                    |
| Player Information   | Unified (preferred hand, travel distance)       |
| Sport Rating         | Sport-specific (separate rating per sport)      |
| Sport Preferences    | Sport-specific (separate preferences per sport) |
| Sports               | Unified (manage all sports)                     |
| Availability         | Sport-specific (separate schedules)             |

## UX Guidelines

### Progressive Disclosure

- Show most common fields first
- Advanced settings (availability, proof) in expandable sections
- Clear section headers and organization

### Mobile Optimization

- Single column layout on mobile
- Large tap targets
- Easy scrolling between sections
- All editing done via bottom sheets (slides up from bottom)
- Each section group has its own edit button that opens a dedicated bottom sheet

### Accessibility

- All fields have labels
- Form validation errors are clear
- Keyboard navigation supported
- Screen reader friendly

## Related Features

- [Player Profiles](../06-player-directory/player-profiles.md) - What others see
- [Player Visibility](../06-player-directory/player-visibility.md) - Privacy controls
- [Level Certification](../04-player-rating/level-certification.md) - Level verification
- [In-App Calendar](../12-calendar/in-app-calendar.md) - Calendar integration
- [Sport Modes](../02-sport-modes/README.md) - Sport context management
