# Audit Trails

## Overview

Comprehensive logging of all administrative actions for accountability and compliance.

## What's Logged

### Admin Actions

| Action Type     | Data Logged                             |
| --------------- | --------------------------------------- |
| User search     | Search terms, timestamp, admin          |
| Profile view    | User viewed, timestamp, admin           |
| Profile edit    | Fields changed, old/new values, admin   |
| Account action  | Action type, target user, reason, admin |
| Impersonation   | Target user, duration, admin            |
| Settings change | Setting, old/new value, admin           |
| Report action   | Report ID, action taken, admin          |

### System Events

| Event             | Data Logged                        |
| ----------------- | ---------------------------------- |
| Admin login       | Admin ID, IP, device, timestamp    |
| Failed login      | Attempted user, IP, timestamp      |
| Permission change | Admin, new permissions, changed by |
| Data export       | Type, scope, admin, timestamp      |

## Log Entry Format

```json
{
  "id": "log_12345",
  "timestamp": "2026-01-10T15:30:00Z",
  "admin_id": "admin_001",
  "admin_email": "admin@rallia.app",
  "action": "user_suspend",
  "target_type": "user",
  "target_id": "user_789",
  "details": {
    "reason": "Repeated harassment",
    "duration": "7 days",
    "report_ids": ["report_123", "report_456"]
  },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

## Log Access

### View Logs

Admin can search and filter logs:

- By admin
- By action type
- By target user
- By date range
- By IP address

### Log Dashboard

```
┌─────────────────────────────────────────┐
│ Audit Log                               │
│ [Filter: All Admins ▼] [Date Range]     │
├─────────────────────────────────────────┤
│ 15:30 admin@rallia.app suspended user   │
│        User: Jean D. • Duration: 7 days │
│                                         │
│ 14:45 mod@rallia.app dismissed report   │
│        Report: #123                     │
│                                         │
│ 14:30 admin@rallia.app viewed user      │
│        User: Marie L.                   │
└─────────────────────────────────────────┘
```

## Retention

### Log Retention Period

- Minimum: 2 years (configurable)
- User actions: May be longer for legal compliance
- Automatic archival after retention period

### Data Protection

- Logs encrypted at rest
- Access restricted to authorized admins
- Cannot be modified or deleted (append-only)

## Compliance

### GDPR / Privacy

When user requests data deletion:

- User data removed from main systems
- Audit logs retained (anonymized if required)
- Document retention policy

### Legal Requests

Audit logs can be exported for:

- Legal discovery
- Regulatory compliance
- Internal investigations

## Alerts

### Automated Alerts

Configure alerts for:

- Multiple failed admin logins
- Unusual patterns (mass actions)
- Actions on VIP/monitored accounts
- Access outside normal hours

### Alert Recipients

- Email to security team
- Slack notification
- In-app admin notification
