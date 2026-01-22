# Moderation

## Overview

Content moderation to ensure safe and respectful communications.

## Automatic Moderation

### Language Filtering

- Filter profanity and slurs
- Block or flag messages with inappropriate content
- Use established content moderation APIs

### Pattern Detection

Detect and flag:

- Spam patterns (repetitive messages)
- Harassment patterns (targeting specific users)
- Suspicious links

### Actions

| Detection       | Action                       |
| --------------- | ---------------------------- |
| Mild profanity  | Replace with asterisks       |
| Severe language | Block message, warn user     |
| Spam            | Block message, temp restrict |
| Harassment      | Flag for admin review        |

## User Reporting

### Report Sources

Reports can be submitted from multiple places in the app:

| Source          | Context                     | See Details                                     |
| --------------- | --------------------------- | ----------------------------------------------- |
| Chat messages   | Long-press message → Report | Below                                           |
| Player profiles | Profile menu → Report       | Below                                           |
| Match feedback  | During post-match feedback  | [Match Closure](../09-matches/match-closure.md) |

### How to Report (Chat/Profile)

1. Long-press on message or tap profile menu
2. Select "Report"
3. Choose reason:
   - Harassment
   - Inappropriate content
   - Spam
   - Threats
   - Other
4. Optional: Add details
5. Submit

### Match Feedback Reports

During post-match feedback, players can report issues specific to the match:

- Harassment
- Unsportsmanlike conduct
- Safety concerns
- Misrepresented level
- Inappropriate conduct

See [Match Closure - Reporting Issues](../09-matches/match-closure.md#reporting-issues) for details.

### What Happens

1. Report logged with context
2. Admin notified
3. Admin reviews and takes action
4. Reporter notified of outcome (optional)

## Admin Actions

See [Admin Portal](../15-admin/README.md) for full admin capabilities.

| Action         | Description                   |
| -------------- | ----------------------------- |
| Warn User      | Send warning message          |
| Delete Message | Remove specific message       |
| Mute User      | Temporarily prevent messaging |
| Suspend User   | Temporary account suspension  |
| Ban User       | Permanent account ban         |

## Blocking vs. Reporting

| Action | Effect                         | Admin Involved |
| ------ | ------------------------------ | -------------- |
| Block  | Personal - blocks for you only | No             |
| Report | Escalates to admin for review  | Yes            |

Users can do both:

- Block for immediate relief
- Report for platform-wide action

## Community/Group Moderation

### Moderator Powers

Group/community moderators can:

- Remove messages
- Remove members
- Mute members temporarily
- Ban members from group

### Escalation

Serious issues escalate to Rallia admins:

- Criminal threats
- Repeated harassment
- Content policy violations

## Safety Guidelines

Display community guidelines:

- Respect other players
- No harassment or discrimination
- No spam or commercial content
- Report violations

## Transparency

- Clear community guidelines
- Explain why content was removed
- Appeal process for wrongly moderated content
