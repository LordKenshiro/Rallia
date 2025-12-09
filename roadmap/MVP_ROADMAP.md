# Rallia MVP Development Roadmap

**Created:** December 8, 2025  
**Target Launch:** March 27, 2026  
**Total Duration:** 16 weeks

---

## Executive Summary

This roadmap outlines the systematic development of the Rallia Tennis & Pickleball MVP application over 16 weeks. The plan is divided into 5 phases, prioritizing core player functionality first, followed by match mechanics, social features, and growth optimization.

### Timeline Overview

| Phase       | Focus Area               | Duration | Dates                       |
| ----------- | ------------------------ | -------- | --------------------------- |
| **Phase 1** | Core Player Features     | 3 weeks  | Dec 9 - Dec 27, 2025        |
| **Phase 2** | Match System             | 4 weeks  | Dec 30, 2025 - Jan 24, 2026 |
| **Phase 3** | Calendar, Map & Courts   | 4 weeks  | Jan 27 - Feb 20, 2026       |
| **Phase 4** | Social & Growth Features | 3 weeks  | Feb 23 - Mar 13, 2026       |
| **Phase 5** | Polish & Launch Prep     | 2 weeks  | Mar 16 - Mar 27, 2026       |

---

## Current State Analysis

### What's Already Built

| Component             | Status      | Details                                                                                 |
| --------------------- | ----------- | --------------------------------------------------------------------------------------- |
| **Authentication**    | ✅ Complete | Supabase Auth with Google/Apple/Facebook social logins                                  |
| **Onboarding Flow**   | ✅ Complete | Sport selection, personal info, player preferences, ratings (NTRP/DUPR), availabilities |
| **Database Schema**   | ✅ Complete | Players, ratings, facilities, courts, organizations, invitations                        |
| **Mobile Navigation** | ✅ Complete | 5-tab structure (Home, Map, Match, Community, Chat) with profile screens                |
| **Admin Dashboard**   | 🟡 Partial  | Basic organization management, user management placeholders                             |
| **Shared Packages**   | ✅ Complete | Components, hooks, services, types, utils                                               |

### What's Missing (by MVP Feature #)

| Feature                  | Status      | Priority | Phase |
| ------------------------ | ----------- | -------- | ----- |
| #5 Player Directory      | Not started | P1       | 1     |
| #6 Player Relations      | Not started | P1       | 1     |
| #8 Reputation System     | Schema only | P2       | 2     |
| #9-14 Match System       | Not started | P1       | 2     |
| #15-16 Court Reservation | Not started | P2       | 3     |
| #17 Calendar             | Not started | P1       | 3     |
| #20 Chat                 | UI only     | P2       | 4     |
| #21 Interactive Map      | UI only     | P2       | 3     |
| #22 Growth Hacks         | Partial     | P3       | 4     |
| #24 Analytics            | Placeholder | P3       | 4     |

## Technology Stack

### Infrastructure & Hosting

| Category            | Service                   | Purpose                                           | Cost Model                      |
| ------------------- | ------------------------- | ------------------------------------------------- | ------------------------------- |
| Domain Registration | Spaceship                 | rallia.ca, rallia.us, rallia.app                  | ~$30/year for 3 domains         |
| App Stores          | Apple Developer Program   | iOS distribution                                  | $99 USD/year                    |
|                     | Google Play Console       | Android distribution                              | One-time $25 fee                |
| Hosting             | Vercel                    | Web app hosting, serverless functions             | Growth/Enterprise pricing TBD   |
| CDN                 | Cloudflare                | Video caching, reduced egress fees from Backblaze | Free tier + usage               |
| CI/CD               | GitHub Actions + Expo EAS | Automated builds, testing, app deployments        | GitHub Free + EAS Build credits |

### Backend & Data

| Category        | Service                     | Purpose                                                                  | Cost Model                  |
| --------------- | --------------------------- | ------------------------------------------------------------------------ | --------------------------- |
| Backend         | Supabase                    | Database (PostgreSQL), Auth, Storage, Realtime, Edge Functions, pg_cron  | Pro plan ~$25/month + usage |
| Primary Storage | Supabase Storage            | User profile pictures, facility images, message attachments              | Included in Supabase plan   |
| Video Storage   | Backblaze B2                | Player level proof videos (with expo-av player, client-side compression) | $5/TB storage + low egress  |
| Search          | PostgreSQL Full-Text Search | Initial search implementation via Supabase                               | Included in Supabase        |
| Real-time Chat  | Supabase Realtime           | WebSocket connections for live chat                                      | Included in Supabase        |

### Maps & Location

| Category  | Service           | Purpose                                       | Cost Model                               |
| --------- | ----------------- | --------------------------------------------- | ---------------------------------------- |
| Map Tiles | MapLibre + MapBox | Open-source maps, avoid Google Maps API costs | MapBox: 50K free loads/month, then usage |
| Geocoding | MapBox Geocoding  | Address search and reverse geocoding          | Included in MapBox usage                 |

### Communication

| Category           | Service                 | Purpose                                    | Cost Model                    |
| ------------------ | ----------------------- | ------------------------------------------ | ----------------------------- |
| Email              | Resend                  | Transactional emails (prefer over SMS)     | 3K free/month, then $20/month |
| SMS                | Telnyx                  | Critical notifications, verification codes | ~$0.004/SMS in US/CA          |
| Push Notifications | Expo Push Notifications | Mobile push notifications                  | Free with Expo                |

### Payments & Monetization

| Category               | Service    | Purpose                                                     | Cost Model                            |
| ---------------------- | ---------- | ----------------------------------------------------------- | ------------------------------------- |
| Web Payments           | Stripe     | Court booking payments, tips                                | 2.9% + $0.30 per transaction          |
| In-App Subscriptions   | RevenueCat | Subscription management, receipt validation, cross-platform | Free to $2.5K MTR, then 1% of revenue |
| Subscription Analytics | RevenueCat | MRR, churn, LTV tracking, cohort analysis                   | Included                              |

### Analytics & Monitoring

| Category                                    | Service                      | Purpose                                                      | Cost Model                        |
| ------------------------------------------- | ---------------------------- | ------------------------------------------------------------ | --------------------------------- |
| Product Analytics + Feature Flags + Metrics | PostHog                      | User behavior, funnels, retention, A/B tests, session replay | Free to 1M events, then usage     |
| Error Tracking                              | Sentry                       | Crash reporting, error monitoring                            | Free to 5K events, Pro at >2K DAU |
| Observability                               | Vercel & Supabase Dashboards | Infrastructure monitoring                                    | Included                          |

### Development Tools

| Category           | Service                           | Purpose                         |
| ------------------ | --------------------------------- | ------------------------------- |
| Project Management | ClickUp                           | Task tracking, sprints, roadmap |
| Diagramming        | Excalidraw, MermaidChart, Draw.io | UML diagrams, architecture docs |
| Customer Support   | Crisp (Post-MVP)                  | In-app chat, support inbox      |

### Key Technical Decisions

| Decision             | Choice                            | Rationale                                                      |
| -------------------- | --------------------------------- | -------------------------------------------------------------- |
| Maps over Google     | MapLibre + MapBox                 | 10x cost savings at scale, open-source flexibility             |
| Video Storage        | Backblaze B2 + Cloudflare         | ~$5/TB vs $23/TB (S3), Cloudflare eliminates egress fees       |
| Email over SMS       | Resend preferred, Telnyx fallback | SMS costs ~$0.004/msg vs email ~$0.001/msg                     |
| All-in-one Backend   | Supabase                          | DB + Auth + Storage + Realtime + Edge Functions in one         |
| All-in-one Analytics | PostHog                           | Analytics + feature flags + session replay in one tool         |
| Subscriptions        | RevenueCat                        | Cross-platform IAP, receipt validation, no App Store headaches |
| SMS over Twilio      | Telnyx                            | ~50% cheaper ($0.004 vs $0.0075/SMS), great DX, same features  |
| Calendar Sync        | ICS file generation               | Universal compatibility with Google/Apple Calendar             |
| Court Booking APIs   | Research per-city                 | Loisirs Montreal first, expand based on API availability       |

---

## Risk Mitigation

| Risk                             | Impact                | Mitigation                                          |
| -------------------------------- | --------------------- | --------------------------------------------------- |
| Holiday slowdown (Dec-Jan)       | Schedule delay        | Front-load critical path work, buffer in estimates  |
| Loisirs Montreal API unavailable | Limited court booking | Fallback to deep links, manual info                 |
| Supabase Realtime limits         | Chat scalability      | Monitor usage, have Stream as backup                |
| App Store rejection              | Launch delay          | Follow guidelines strictly, submit early for review |
| Low initial user adoption        | Growth challenges     | Growth hacks prioritized, viral mechanics built-in  |

---

## Success Metrics for MVP Launch

| Metric                          | Target                  | Measurement |
| ------------------------------- | ----------------------- | ----------- |
| Onboarding completion rate      | >70%                    | Analytics   |
| Matches created per active user | >2/month                | Database    |
| Match completion rate           | >80%                    | Database    |
| Chat engagement                 | >50% of matched players | Database    |
| App Store rating                | >4.0 stars              | App Store   |
| Day 7 retention                 | >30%                    | Analytics   |

---

## Appendix: File Structure After MVP

```
apps/
├── mobile/
│   └── src/
│       ├── features/
│       │   ├── onboarding/       # ✅ Exists
│       │   ├── players/          # 🆕 Phase 1
│       │   ├── relations/        # 🆕 Phase 1
│       │   ├── matches/          # 🆕 Phase 2
│       │   ├── calendar/         # 🆕 Phase 3
│       │   ├── map/              # 🔄 Phase 3 (update)
│       │   └── chat/             # 🔄 Phase 4 (update)
│       ├── screens/              # ✅ Exists
│       ├── hooks/                # ✅ Exists
│       └── services/             # ✅ Exists
└── web/
    └── app/
        └── [locale]/
            ├── (admin)/          # ✅ Exists, 🔄 Phase 4 (analytics)
            ├── (club)/           # 🆕 Phase 3
            └── (marketing)/      # ✅ Exists

supabase/
└── migrations/
    ├── 001_add_player_relations.sql    # 🆕 Phase 1
    ├── 002_extend_matches.sql          # 🆕 Phase 2
    ├── 003_reputation_tracking.sql     # 🆕 Phase 2
    └── 004_chat_tables.sql             # 🆕 Phase 4
```

---

## Contact & Ownership

| Role        | Owner          | Responsibility               |
| ----------- | -------------- | ---------------------------- |
| Product     | Mathis Lefranc | Requirements, priorities     |
| Engineering | Eric Kenmogne  | Implementation, architecture |
| Business    | Jean Sonkin    | Partnerships, growth         |

---

_Last Updated: December 8, 2025_
