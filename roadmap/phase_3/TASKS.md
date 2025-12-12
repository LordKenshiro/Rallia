## Phase 3: Calendar, Map & Court Features

**Duration:** 4 weeks  
**Dates:** January 27 - February 20, 2026

### Week 8: Jan 27 - Jan 31, 2026

#### 3.1 Calendar - Core (Feature #17)

| Task                      | Description                           | Estimate |
| ------------------------- | ------------------------------------- | -------- |
| CalendarWeekView          | Week view component with 30min slots  | 12h      |
| Calendar Data Integration | Display accepted matches, invitations | 8h       |
| Create from Calendar      | Tap slot to create match              | 6h       |
| Calendar Navigation       | Week scrolling, date picker           | 6h       |

**New Files:**

```
apps/mobile/src/features/calendar/
├── CalendarScreen.tsx
├── CalendarWeekView.tsx
├── CalendarDayView.tsx
├── CalendarSlot.tsx
├── hooks/
│   └── useCalendarData.ts
└── index.ts
```

### Week 9: Feb 3 - Feb 7, 2026

#### 3.1 Calendar - Advanced (Feature #17)

| Task                 | Description                                              | Estimate |
| -------------------- | -------------------------------------------------------- | -------- |
| Match Reminders      | Expo Push Notifications day before + day of              | 6h       |
| ICS Export           | Generate .ics file on match acceptance                   | 6h       |
| Calendar Privacy     | Public/private toggle + viewer access                    | 4h       |
| View Other Calendars | View public calendars of other players                   | 4h       |
| Reminder Service     | Supabase Edge Function + pg_cron for reminder scheduling | 4h       |
| PostHog Events       | Track calendar views and exports                         | 2h       |

#### 3.2 Interactive Map - Core (Feature #21)

| Task           | Description                                       | Estimate |
| -------------- | ------------------------------------------------- | -------- |
| Map Setup      | Configure MapLibre GL with MapBox tiles           | 6h       |
| Court Markers  | Display courts/facilities on map                  | 6h       |
| Player Markers | Display nearby players (privacy-respecting)       | 6h       |
| Match Markers  | Display available matches                         | 4h       |
| Geocoding      | Integrate MapBox Geocoding API for address search | 4h       |
| PostHog Events | Track map interactions and marker clicks          | 2h       |

**New Files:**

```
apps/mobile/src/features/map/
├── MapScreen.tsx (update existing)
├── components/
│   ├── CourtMarker.tsx
│   ├── PlayerMarker.tsx
│   ├── MatchMarker.tsx
│   ├── MapFilters.tsx
│   └── CourtDetailCard.tsx
└── index.ts
```

### Week 10: Feb 10 - Feb 14, 2026

#### 3.2 Interactive Map - Advanced (Feature #21)

| Task               | Description                              | Estimate |
| ------------------ | ---------------------------------------- | -------- |
| Layer Toggles      | Toggle courts/players/matches visibility | 4h       |
| Sport Filter       | Filter by Tennis/Pickleball              | 2h       |
| Court Detail Cards | Tap marker for court info + booking link | 6h       |
| Clustering         | Cluster markers when zoomed out          | 4h       |

#### 3.3 Court Reservation (Feature #15)

| Task                      | Description                                  | Estimate |
| ------------------------- | -------------------------------------------- | -------- |
| Loisirs Montreal Research | API availability, authentication             | 8h       |
| Court Info Display        | Surface, indoor/outdoor, lighting, amenities | 6h       |
| External Booking Links    | Deep-link to booking systems                 | 4h       |
| Court Availability        | Display where API available                  | 8h       |
| Court Images              | Store court images in Supabase Storage       | 4h       |
| PostHog Events            | Track court detail views and booking clicks  | 2h       |

### Week 11: Feb 17 - Feb 20, 2026

#### 3.4 Club Court Listing Portal (Feature #16)

**Web Admin Expansion:**

| Task               | Description                                      | Estimate |
| ------------------ | ------------------------------------------------ | -------- |
| Club Signup Flow   | Organization onboarding for clubs                | 8h       |
| Court Inventory UI | Calendar-based availability management           | 12h      |
| Booking Dashboard  | View/manage bookings                             | 8h       |
| Club Analytics     | PostHog integration for occupancy metrics        | 8h       |
| Court Images       | Upload facility/court images to Supabase Storage | 4h       |
| PostHog Events     | Track club signups and court bookings            | 2h       |

**New Files (Web):**

```
apps/web/app/[locale]/(club)/
├── layout.tsx
├── dashboard/
│   └── page.tsx
├── courts/
│   ├── page.tsx
│   └── [courtId]/
│       └── page.tsx
├── bookings/
│   └── page.tsx
├── analytics/
│   └── page.tsx
└── settings/
    └── page.tsx
```

### Phase 3 Milestone Checklist

- [ ] In-app calendar shows matches and availabilities
- [ ] Players can create matches from calendar
- [ ] Match reminders work via push notifications
- [ ] Calendar exports to Google/Apple Calendar
- [ ] Interactive map shows courts, players, matches
- [ ] Map layers can be toggled
- [ ] Court information is displayed with booking links
- [ ] Clubs can list courts and manage bookings

---
