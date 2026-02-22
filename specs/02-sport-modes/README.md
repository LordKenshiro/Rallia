# 02 - Sport Modes

> Management of Tennis and Pickleball interface separation and switching.

## Overview

The application maintains complete separation between Tennis and Pickleball universes. Each sport has its own interface, data, and experience, even though features are nearly identical.

## Sub-documents

| Document                                                 | Description                              |
| -------------------------------------------------------- | ---------------------------------------- |
| [interface-switching.md](./interface-switching.md)       | How users switch between sport universes |
| [visual-differentiation.md](./visual-differentiation.md) | Visual cues distinguishing each sport    |
| [data-separation.md](./data-separation.md)               | How data is partitioned between sports   |

## User Stories

- As a dual-sport player, I want to easily switch between Tennis and Pickleball modes
- As a user, I want to always know which sport context I'm currently in
- As a user, I want my Tennis and Pickleball activities to be clearly separated

## Dependencies

| System                                              | Relationship                                           |
| --------------------------------------------------- | ------------------------------------------------------ |
| [01 Authentication](../01-authentication/README.md) | Receives sport selection from onboarding               |
| [08 Communications](../08-communications/README.md) | Notifications must indicate which sport they relate to |
| All other systems                                   | Must respect current sport context                     |

## Core Philosophy

> **Total separation** between the 2 sports, universes, and associated features once onboarding is complete.

Each sport has its own:

- Player directory
- Match listings
- Groups and communities
- Ratings and reputation
- Visual identity

## Key Requirements

- Clear visual distinction between sport modes
- Confirmation when switching sports
- All communications identify their sport context
- Sport context always visible in UI

## Reference

- Playtomic app for sport mode switching patterns
