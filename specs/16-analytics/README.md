# 16 - Analytics

> Metrics, reporting, and data insights for understanding app performance.

## Overview

The analytics system collects and presents data to understand user behavior, measure success, and guide product decisions.

## Sub-documents

| Document                                         | Description                   |
| ------------------------------------------------ | ----------------------------- |
| [user-metrics.md](./user-metrics.md)             | Player-related metrics        |
| [match-metrics.md](./match-metrics.md)           | Match-related metrics         |
| [court-metrics.md](./court-metrics.md)           | Court and booking metrics     |
| [onboarding-metrics.md](./onboarding-metrics.md) | Signup and onboarding metrics |

## User Stories

- As a product manager, I want to see how many users signed up this week
- As a business owner, I want to understand match completion rates
- As a growth lead, I want to track referral effectiveness
- As an ops lead, I want to see court utilization

## Dependencies

| System                            | Relationship                              |
| --------------------------------- | ----------------------------------------- |
| [14 Admin](../15-admin/README.md) | Analytics accessible through admin portal |
| All systems                       | Data collected from all parts of the app  |

## Data Principles

### Historical Data

> **Important:** All historical data must be retained for trend analysis.
> Retention period: TBD (discuss with legal/compliance)

### Cumulative + Point-in-Time

For each metric, track:

- **Cumulative total** (all-time)
- **Period snapshots** (daily, weekly, monthly, yearly)
- **Trend over time** (charts)

## Sport Separation

All metrics available filtered by:

- Combined (both sports)
- Tennis only
- Pickleball only

## Access Levels

| Role         | Access                   |
| ------------ | ------------------------ |
| Super Admin  | Full analytics           |
| Product Team | Core metrics             |
| Growth Team  | Acquisition metrics      |
| Club Portal  | Their own analytics only |

## Dashboard Overview

Main dashboard showing:

- Key KPIs at a glance
- Trend charts
- Alerts for anomalies
- Quick filters (date, sport, region)
