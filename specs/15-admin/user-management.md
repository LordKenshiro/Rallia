# User Management

## Overview

Administrative capabilities for managing player accounts.

## User Search

### Search Criteria

| Field       | Search Type             |
| ----------- | ----------------------- |
| Name        | Partial match           |
| Email       | Exact or partial        |
| Phone       | Exact or partial        |
| User ID     | Exact                   |
| City        | Filter                  |
| Skill Level | Range filter            |
| Status      | Active/Suspended/Banned |

### Search Results

```
┌─────────────────────────────────────────┐
│ Search: "jean"                          │
├─────────────────────────────────────────┤
│ Jean Dupont • jean@email.com            │
│ Montreal • NTRP 4.0 • Active            │
│ [View] [Edit] [Actions ▼]               │
├─────────────────────────────────────────┤
│ Jean-Pierre Martin • jp@email.com       │
│ Toronto • NTRP 3.5 • Suspended          │
│ [View] [Edit] [Actions ▼]               │
└─────────────────────────────────────────┘
```

## User Profile (Admin View)

### All Information

Admin can see:

- All public profile information
- Private information (email, phone, address)
- Account status and history
- All matches (past and upcoming)
- All groups and communities
- All messages (with proper authorization)
- Reputation history
- Level history
- Payment history (if applicable)

### Profile Actions

| Action             | Description               |
| ------------------ | ------------------------- |
| Edit Profile       | Modify any field          |
| Reset Password     | Send reset email          |
| Verify Email/Phone | Manually verify           |
| Adjust Level       | Override skill level      |
| Adjust Reputation  | Override reputation score |

## Account Actions

### Warn User

Send official warning:

1. Select warning template
2. Customize message
3. Send
4. Logged to user history

### Suspend User

Temporary account restriction:

1. Set suspension duration
2. Select reason
3. Optional: Custom message
4. Confirm
5. User notified and logged out

During suspension:

- Cannot log in
- Cannot receive match invitations
- Profile hidden from search

### Ban User

Permanent account removal:

1. Select reason
2. Confirm (requires re-authentication)
3. User notified
4. Account deactivated

Banned users:

- Cannot log in
- Cannot create new account with same email/phone
- Data retained for legal/audit purposes

### Reinstate User

Reverse suspension or ban:

1. Search for user
2. View suspension/ban history
3. Click "Reinstate"
4. Confirm
5. User can log in again

## Impersonation

View app as a specific user:

1. Search for user
2. Click "Impersonate"
3. Authenticate (additional security)
4. See app exactly as user sees it
5. Actions logged but attributed to admin

Use cases:

- Debugging user-reported issues
- Understanding user experience
- Testing specific scenarios
