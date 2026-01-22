## Phase 4: Social & Growth Features

**Duration:** 3 weeks  
**Dates:** February 23 - March 13, 2026

### Week 12: Feb 23 - Feb 27, 2026

#### 4.1 Chat System (Feature #20)

**Database Migration:**

```sql
-- supabase/migrations/004_chat_tables.sql

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL DEFAULT 'direct', -- direct, group, community, match
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  group_id UUID REFERENCES player_groups(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, player_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text', -- text, quick_response, system
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quick_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE, -- null = system default
  text VARCHAR(100) NOT NULL,
  emoji VARCHAR(10),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_conversation_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_player ON conversation_participants(player_id);
```

| Task                   | Description                             | Estimate |
| ---------------------- | --------------------------------------- | -------- |
| Chat Service           | Supabase Realtime WebSocket integration | 8h       |
| ChatListScreen         | List of conversations                   | 6h       |
| ChatRoomScreen         | Message thread UI                       | 10h      |
| Quick Responses        | Pre-written message buttons             | 4h       |
| Match Chat Auto-create | Create conversation on match acceptance | 4h       |
| Message Attachments    | Store attachments in Supabase Storage   | 6h       |
| PostHog Events         | Track chat engagement metrics           | 2h       |
| Sentry Integration     | Error tracking for chat failures        | 2h       |

**New Files:**

```
apps/mobile/src/features/chat/
├── ChatListScreen.tsx (update existing)
├── ChatRoomScreen.tsx
├── components/
│   ├── MessageBubble.tsx
│   ├── QuickResponses.tsx
│   ├── ChatInput.tsx
│   └── ConversationItem.tsx
├── hooks/
│   └── useChat.ts
└── index.ts
```

### Week 13: Mar 2 - Mar 6, 2026

#### 4.1 Chat - Advanced (Feature #20)

| Task                 | Description                           | Estimate |
| -------------------- | ------------------------------------- | -------- |
| Group/Community Chat | Chat rooms for groups and communities | 8h       |
| Block in Chat        | Block user from conversation          | 4h       |
| Report Message       | Report inappropriate content          | 4h       |
| Content Moderation   | Basic profanity filter                | 4h       |

#### 4.2 Growth Hacks (Feature #22)

| Task                        | Description                              | Estimate |
| --------------------------- | ---------------------------------------- | -------- |
| First Match Contact Sharing | Force contact sharing on first match     | 6h       |
| Invite Friends Flow         | Resend email + Telnyx SMS + social share | 8h       |
| Accept Without Account      | Guest acceptance flow                    | 8h       |
| Mailing List Collection     | Store non-user contacts in Supabase      | 4h       |
| Social Share                | Share public matches to social media     | 4h       |
| Email Templates             | Create Resend templates for invites      | 4h       |
| SMS Templates               | Create Telnyx templates for invites      | 4h       |
| PostHog Events              | Track invite sends and conversions       | 2h       |

### Week 14: Mar 9 - Mar 13, 2026

#### 4.3 "Most Wanted Player" Badge (Feature #18)

| Task                     | Description                                             | Estimate |
| ------------------------ | ------------------------------------------------------- | -------- |
| Badge Logic              | Certified level + 90%+ reputation                       | 4h       |
| Badge Display            | Show on profile and player cards                        | 4h       |
| Daily Email Digest       | Supabase Edge Function + pg_cron for daily Resend email | 6h       |
| "Most Wanted Game" Badge | Badge for MWP's ready-to-play matches                   | 2h       |
| PostHog Events           | Track badge visibility and engagement                   | 2h       |

#### 4.4 Analytics Dashboard (Feature #24)

| Task                    | Description                              | Estimate |
| ----------------------- | ---------------------------------------- | -------- |
| PostHog Integration     | Configure PostHog for analytics          | 4h       |
| Onboarding Funnel       | PostHog funnel for step completion rates | 6h       |
| Player Activity Metrics | PostHog DAU/WAU/MAU tracking             | 6h       |
| Match Metrics           | PostHog insights for match lifecycle     | 6h       |
| Geographic Breakdown    | PostHog breakdown by city/region         | 4h       |
| Admin Dashboard UI      | PostHog embedded charts and KPIs         | 8h       |
| Feature Flags           | PostHog feature flags for A/B testing    | 4h       |
| Session Replay          | PostHog session replay for debugging     | 2h       |

**New Files (Web):**

```
apps/web/app/[locale]/(admin)/admin/analytics/
├── page.tsx (update)
├── components/
│   ├── OnboardingFunnel.tsx
│   ├── PlayerActivityChart.tsx
│   ├── MatchMetrics.tsx
│   ├── GeographicBreakdown.tsx
│   └── ReputationDistribution.tsx
└── hooks/
    └── useAnalytics.ts
```

#### 4.5 Suggestion Box

| Task                | Description                | Estimate |
| ------------------- | -------------------------- | -------- |
| Feedback Form       | In-app feedback submission | 4h       |
| Admin Feedback View | View and manage feedback   | 4h       |

### Phase 4 Milestone Checklist

- [ ] 1-on-1 chat works between matched players
- [ ] Group and community chat rooms work
- [ ] Chat has quick responses and moderation
- [ ] Growth hacks are implemented (contact sharing, invites)
- [ ] "Most Wanted Player" badge system works
- [ ] Analytics dashboard shows key metrics
- [ ] Suggestion box is available to users

---
