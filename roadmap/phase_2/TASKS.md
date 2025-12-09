## Phase 2: Match System

**Duration:** 4 weeks  
**Dates:** December 30, 2025 - January 24, 2026  
**Holiday Note:** Jan 1 (New Year's Day) - reduced capacity expected

### Week 4: Dec 30, 2025 - Jan 3, 2026

#### 2.1 Match Creation - Database & Core (Feature #9)

**Database Migration Required:**

```sql
-- supabase/migrations/002_extend_matches.sql

-- Match visibility enum
CREATE TYPE match_visibility_enum AS ENUM ('public', 'private');
CREATE TYPE match_validation_enum AS ENUM ('auto', 'manual');
CREATE TYPE match_court_status_enum AS ENUM ('reserved', 'to_reserve');
CREATE TYPE match_expectation_enum AS ENUM ('practice', 'competitive', 'both');

-- Extend or create matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id),

  -- Scheduling
  match_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL, -- 30, 60, 90, 120

  -- Location
  facility_id UUID REFERENCES facilities(id),
  court_id UUID REFERENCES courts(id),
  location_name VARCHAR(255),
  location_address TEXT,
  location_latitude DECIMAL(9,6),
  location_longitude DECIMAL(9,6),
  search_radius_km INT, -- if no specific location

  -- Court status
  court_status match_court_status_enum NOT NULL DEFAULT 'to_reserve',
  court_cost DECIMAL(10,2),
  cost_split_50_50 BOOLEAN DEFAULT true,

  -- Match settings
  match_type VARCHAR(20) NOT NULL DEFAULT 'singles', -- singles, doubles
  min_level_required DECIMAL(3,1),
  max_level_allowed DECIMAL(3,1),
  target_gender VARCHAR(20), -- male, female, any
  expectations match_expectation_enum NOT NULL DEFAULT 'both',

  -- Visibility & validation
  visibility match_visibility_enum NOT NULL DEFAULT 'public',
  validation_type match_validation_enum NOT NULL DEFAULT 'auto',

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, filled, cancelled, completed, expired

  -- Additional info
  description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Match invitations (for private matches)
CREATE TABLE match_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  invited_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  invited_group_id UUID REFERENCES player_groups(id) ON DELETE CASCADE,
  invited_community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  invited_contact_id UUID REFERENCES private_contacts(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, declined, expired
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Match participants (confirmed players)
CREATE TABLE match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_number INT, -- for doubles
  is_creator BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  UNIQUE(match_id, player_id)
);

-- Match templates
CREATE TABLE match_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  template_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_matches_sport ON matches(sport_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_visibility ON matches(visibility);
CREATE INDEX idx_matches_created_by ON matches(created_by);
CREATE INDEX idx_match_invitations_match ON match_invitations(match_id);
CREATE INDEX idx_match_invitations_player ON match_invitations(invited_player_id);
CREATE INDEX idx_match_participants_match ON match_participants(match_id);
CREATE INDEX idx_match_participants_player ON match_participants(player_id);
```

| Task               | Description                            | Estimate |
| ------------------ | -------------------------------------- | -------- |
| Database Migration | Run migration for match tables         | 2h       |
| Match Types        | Define TypeScript types for matches    | 4h       |
| Match Service      | Create Supabase service for match CRUD | 8h       |
| PostHog Setup      | Configure PostHog for match analytics  | 2h       |
| Sentry Integration | Add Sentry error tracking for matches  | 2h       |

### Week 5: Jan 6 - Jan 10, 2026

#### 2.1 Match Creation - UI (Feature #9)

| Task               | Description                                   | Estimate |
| ------------------ | --------------------------------------------- | -------- |
| CreateMatchOverlay | Multi-step wizard for match creation          | 16h      |
| Date/Time Picker   | Date selection + time slot + duration         | 6h       |
| Location Picker    | MapBox Geocoding API + radius selection       | 8h       |
| Recipient Selector | Select players, groups, communities, contacts | 8h       |
| Match Templates    | Save/load match templates to Supabase         | 4h       |
| PostHog Events     | Track match creation funnel steps             | 2h       |

**New Files:**

```
apps/mobile/src/features/matches/
├── CreateMatchOverlay.tsx
├── components/
│   ├── DateTimePicker.tsx
│   ├── LocationPicker.tsx
│   ├── RecipientSelector.tsx
│   ├── MatchSettingsForm.tsx
│   └── MatchPreview.tsx
├── hooks/
│   └── useCreateMatch.ts
├── services/
│   └── matchService.ts
└── index.ts
```

**Deliverables:**

- [ ] Complete match creation wizard with all MVP fields
- [ ] Pre-filled defaults from player preferences
- [ ] Match templates system
- [ ] "Ready to Play" badge for reserved courts

### Week 6: Jan 13 - Jan 17, 2026

#### 2.2 Match Reception & Visualization (Features #10, #13)

| Task                     | Description                                                     | Estimate |
| ------------------------ | --------------------------------------------------------------- | -------- |
| ReceivedMatchesScreen    | Private invitations list                                        | 8h       |
| PublicMatchesScreen      | Open Market - all public matches                                | 8h       |
| MatchCard Component      | Match card with all key info                                    | 6h       |
| Match Filters            | Filter by date, level, location, type                           | 6h       |
| Saved Filters            | Save custom filter combinations                                 | 4h       |
| Push Notifications Setup | Configure Expo Push Notifications                               | 8h       |
| Notification Service     | Integrate Resend (email) + Telnyx (SMS) for match notifications | 6h       |
| PostHog Events           | Track match views, filters, interactions                        | 2h       |

**New Files:**

```
apps/mobile/src/features/matches/
├── ReceivedMatchesScreen.tsx
├── PublicMatchesScreen.tsx
├── MatchCard.tsx
├── MatchFilters.tsx
└── MatchDetailScreen.tsx
```

#### 2.3 Match Lifecycle - Accept/Decline (Feature #11)

| Task                  | Description                                     | Estimate |
| --------------------- | ----------------------------------------------- | -------- |
| Accept Flow           | Accept match with conflict detection            | 6h       |
| Decline Flow          | Decline with optional reason                    | 4h       |
| Join vs Ask to Join   | Implement based on validation_type              | 4h       |
| Conflict Detection    | Check calendar for scheduling conflicts         | 6h       |
| Notification Triggers | Send Resend email + Expo push on accept/decline | 4h       |
| PostHog Events        | Track match acceptance/decline rates            | 2h       |

### Week 7: Jan 20 - Jan 24, 2026

#### 2.3 Match Lifecycle - Cancellation & Feedback (Features #11, #12)

| Task                     | Description                                 | Estimate |
| ------------------------ | ------------------------------------------- | -------- |
| Cancellation Flow        | Cancel match with notifications             | 6h       |
| Re-activation Logic      | Re-open to other invitees on cancellation   | 4h       |
| PostMatchFeedbackOverlay | Feedback form after match end               | 10h      |
| Auto-closure             | Supabase pg_cron job for 48h auto-closure   | 4h       |
| Notification Service     | Resend email + Telnyx SMS for cancellations | 4h       |
| PostHog Events           | Track cancellation rates and reasons        | 2h       |

**PostMatchFeedbackOverlay Fields:**

- Show/No-show confirmation
- Match occurred (yes/no)
- Punctuality (+10min late)
- 5-star satisfaction rating
- Skill level evaluation (certified players only)
- Comments

#### 2.4 Reputation System (Feature #8)

**Database Migration:**

```sql
-- supabase/migrations/003_reputation_tracking.sql

CREATE TABLE match_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Feedback data
  opponent_showed BOOLEAN NOT NULL,
  match_occurred BOOLEAN NOT NULL,
  opponent_late BOOLEAN NOT NULL DEFAULT false,
  satisfaction_rating INT NOT NULL CHECK (satisfaction_rating BETWEEN 1 AND 5),
  skill_rating_value DECIMAL(3,1), -- NTRP/DUPR value if certified reviewer
  comments TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(match_id, reviewer_id, reviewed_id)
);

-- Add reputation fields to players if not exists
ALTER TABLE players ADD COLUMN IF NOT EXISTS reputation_score DECIMAL(5,2) DEFAULT 100;
ALTER TABLE players ADD COLUMN IF NOT EXISTS matches_played INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS reputation_calculated_at TIMESTAMPTZ;

-- Reputation history for visualization
CREATE TABLE reputation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  previous_score DECIMAL(5,2) NOT NULL,
  new_score DECIMAL(5,2) NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Task                  | Description                             | Estimate |
| --------------------- | --------------------------------------- | -------- |
| Reputation Calculator | Implement formula from specs            | 6h       |
| Reputation Service    | Supabase Edge Function for calculations | 4h       |
| Reputation Badge      | 90%+ badge display                      | 2h       |
| Reputation History    | History visualization chart             | 4h       |
| PostHog Metrics       | Track reputation score distribution     | 2h       |

**Reputation Formula:**

```
Reputation = Previous + Cancellation[-25/0] + Show[+25/-50] + Punctuality[+5/-10] + Stars[+20 to -10]

Stars mapping:
- 5 stars: +20%
- 4 stars: +10%
- 3 stars: +0%
- 2 stars: -5%
- 1 star: -10%
```

#### 2.5 Last-Minute Matches (Feature #14)

| Task               | Description              | Estimate |
| ------------------ | ------------------------ | -------- |
| Last-Minute Filter | Show matches in next 24h | 4h       |
| Auto-suggest       | Suggest on cancellation  | 2h       |

### Phase 2 Milestone Checklist

- [ ] Players can create matches with all MVP fields
- [ ] Matches can be public or sent to specific recipients
- [ ] Players can view received and public matches
- [ ] Players can accept/decline matches with conflict detection
- [ ] Players can cancel matches with proper notifications
- [ ] Post-match feedback system is functional
- [ ] Reputation is calculated and displayed
- [ ] Last-minute matches filter works

---
