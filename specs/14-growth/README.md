# 14 - Growth & Virality

> Viral mechanics, invitations, and organic user acquisition.

## Overview

The growth system implements "growth hacks" - marketing, technological, and psychological techniques to drive organic user acquisition without external marketing spend.

## Sub-documents

| Document                                             | Description                      |
| ---------------------------------------------------- | -------------------------------- |
| [invitation-mechanics.md](./invitation-mechanics.md) | How users invite others          |
| [referral-system.md](./referral-system.md)           | Tracking and rewarding referrals |
| [social-sharing.md](./social-sharing.md)             | Sharing to social media          |

## User Stories

- As a new user, I want to invite my friends to play with me
- As a user, I want to share my match to social media
- As a user creating my first match, I want to easily invite contacts

## Dependencies

| System                                                  | Relationship                               |
| ------------------------------------------------------- | ------------------------------------------ |
| [06 Player Relations](../07-player-relations/README.md) | Private lists feed invitation targets      |
| [08 Matches](../09-matches/README.md)                   | Match creation triggers invitation prompts |

## Core Philosophy

> The app must be **intrinsically viral** - designed so that normal usage naturally leads to new user acquisition.

## Growth Mechanisms

| Mechanism            | Trigger                                           |
| -------------------- | ------------------------------------------------- |
| First Match Force    | Creating first match requires sending invitations |
| Private Lists        | Inviting non-users to matches captures their info |
| Non-User Acceptance  | Accepting match captures contact info             |
| Public Match Sharing | Prompt to share public matches on social media    |
| Auto-Invitations     | Use captured contact info for app invitations     |

## Mailing List Building

Contact info collected from:

1. Private lists (contacts added by users)
2. Non-user match acceptances
3. External lists (partnerships, etc.)

## References

- Cold Start Problem by Andrew Chen
- Splitwise for forced invitation flow
- Growth hacking best practices
