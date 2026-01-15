# Level Initialization

## Overview

Players select a rating score card (e.g., 4.5 NTRP) to initialize their skill level for each sport. This occurs during onboarding for selected sports, or via a bottom sheet when activating a sport later through the user profile.

## Onboarding Flow

During the onboarding wizard, for each sport the player has selected:

1. Display rating score cards for the appropriate scale:
   - **Tennis**: NTRP scale (1.0 - 7.0)
   - **Pickleball**: DUPR scale (2.0 - 8.0)
2. Each card displays the rating value (e.g., "4.5") and brief description
3. Player selects one rating card
4. Selection is required to proceed with onboarding

**Reference:** See [Level Scales](./level-scales.md) for complete scale descriptions.

## Profile Activation Flow

When a player activates a sport that was never selected before (via user profile settings):

1. Display a bottom sheet with rating score cards
2. Cards use the same format as onboarding:
   - **Tennis**: NTRP scale cards
   - **Pickleball**: DUPR scale cards
3. Player must select a rating score card to activate the sport
4. Sport remains inactive until a rating is selected

## Rating Score Card Format

Each card displays:

- Rating value (e.g., "4.5", "3.0")
- Scale identifier (e.g., "NTRP", "DUPR")
- Brief level description (from scale definitions)

## Initial State

| Attribute            | Value                      |
| -------------------- | -------------------------- |
| Level                | Selected rating card value |
| Certification Status | Not certified              |
| References           | 0                          |
| Proofs               | None                       |

## UX Guidelines

- Present cards in a clear, scannable grid layout
- Make level descriptions visible on cards or accessible via tap
- Explain that level can be updated later
- Emphasize honesty for better match quality
- Ensure bottom sheet is dismissible only after selection (or cancel activation)

## Post-Initialization Prompt

After setting level, prompt players at certification threshold (3.0+ Tennis, 3.5+ Pickleball):

> "Want to get your level certified? Get references from 3 players at your level or above."

Offer to skip and do later.
