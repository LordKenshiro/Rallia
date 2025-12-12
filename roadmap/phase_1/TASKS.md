## Phase 1: Core Player Features

**Duration:** 3 weeks  
**Dates:** December 9 - December 27, 2025  
**Holiday Note:** Dec 24-25 (Christmas), Dec 31 (New Year's Eve) - reduced capacity expected

### Week 1: Dec 9 - Dec 13, 2025

#### 1.1 Onboarding Polish

**Database Migration Required:**

```sql
-- supabase/migrations/001_add_player_home_address_fields.sql

-- Add home address fields to player table (for radius-based match searches)
ALTER TABLE player ADD COLUMN IF NOT EXISTS home_address VARCHAR(255);
ALTER TABLE player ADD COLUMN IF NOT EXISTS home_city VARCHAR(100);
ALTER TABLE player ADD COLUMN IF NOT EXISTS home_postal_code VARCHAR(20);
ALTER TABLE player ADD COLUMN IF NOT EXISTS home_country country_enum;
ALTER TABLE player ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(9,6);
ALTER TABLE player ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(9,6);
ALTER TABLE player ADD COLUMN IF NOT EXISTS home_location GEOGRAPHY(Point,4326);
ALTER TABLE player ADD COLUMN IF NOT EXISTS home_location_disclosed BOOLEAN NOT NULL DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_player_home_location_geo ON player USING GIST(home_location);
CREATE INDEX IF NOT EXISTS idx_player_home_location_disclosed ON player(home_location_disclosed) WHERE home_location_disclosed = true;

-- Player rating score history (for tracking rating evolution over time)
CREATE TABLE player_rating_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_rating_score_id UUID NOT NULL REFERENCES player_rating_score(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  rating_score_id UUID NOT NULL REFERENCES rating_score(id) ON DELETE RESTRICT,
  previous_rating_score_id UUID REFERENCES rating_score(id) ON DELETE SET NULL,
  rating_value FLOAT,
  is_certified BOOLEAN NOT NULL DEFAULT false,
  certified_via rating_certification_method_enum,
  referrals_count INT NOT NULL DEFAULT 0,
  evaluations_count INT NOT NULL DEFAULT 0,
  source VARCHAR(100),
  change_reason VARCHAR(255),
  changed_by UUID REFERENCES profile(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for rating history
CREATE INDEX idx_player_rating_score_history_player_rating ON player_rating_score_history(player_rating_score_id);
CREATE INDEX idx_player_rating_score_history_player ON player_rating_score_history(player_id);
CREATE INDEX idx_player_rating_score_history_recorded ON player_rating_score_history(player_id, recorded_at);

-- Function to automatically record rating score history when ratings change
CREATE OR REPLACE FUNCTION record_player_rating_score_history()
RETURNS TRIGGER AS $$
DECLARE
  previous_rating_score_id UUID;
  rating_value FLOAT;
BEGIN
  -- Get the previous rating_score_id if this is an update
  IF TG_OP = 'UPDATE' THEN
    previous_rating_score_id := OLD.rating_score_id;

    -- Only record history if the rating_score_id actually changed
    IF OLD.rating_score_id = NEW.rating_score_id THEN
      RETURN NEW;
    END IF;
  ELSE
    -- For INSERT, there's no previous rating
    previous_rating_score_id := NULL;
  END IF;

  -- Get the rating value from the rating_score table
  SELECT rs.value INTO rating_value
  FROM rating_score rs
  WHERE rs.id = NEW.rating_score_id;

  -- Insert history record
  INSERT INTO player_rating_score_history (
    player_rating_score_id,
    player_id,
    rating_score_id,
    previous_rating_score_id,
    rating_value,
    is_certified,
    certified_via,
    referrals_count,
    evaluations_count,
    source,
    change_reason,
    changed_by,
    recorded_at
  ) VALUES (
    NEW.id,
    NEW.player_id,
    NEW.rating_score_id,
    previous_rating_score_id,
    rating_value,
    NEW.is_certified,
    NEW.certified_via,
    NEW.referrals_count,
    NEW.evaluations_count,
    NEW.source,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'Initial rating assignment'
      WHEN TG_OP = 'UPDATE' THEN 'Rating updated'
    END,
    auth.uid(),
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically record history on INSERT or UPDATE
CREATE TRIGGER trigger_record_player_rating_score_history
  AFTER INSERT OR UPDATE OF rating_score_id, is_certified, certified_via, referrals_count, evaluations_count, source
  ON player_rating_score
  FOR EACH ROW
  EXECUTE FUNCTION record_player_rating_score_history();
```

| Task                          | Description                                                                   | Estimate |
| ----------------------------- | ----------------------------------------------------------------------------- | -------- |
| Location Permissions          | Integrate actual location permission request with `LocationPermissionOverlay` | 4h       |
| Calendar Permissions          | Request calendar access permission during onboarding                          | 3h       |
| Push Notification Permissions | Request push notification permission during onboarding                        | 3h       |
| Home Location Setup           | Add home location collection during onboarding (address, city, postal code)   | 6h       |
| Geocoding Integration         | Integrate MapBox Geocoding API to convert address to coordinates              | 4h       |
| Progress Persistence          | Store onboarding progress in AsyncStorage for resume functionality            | 4h       |
| PostHog Integration           | Track onboarding funnel steps (step completion rates)                         | 4h       |
| Sentry Setup                  | Configure Sentry for error tracking during onboarding                         | 2h       |
| Profile Picture Upload        | Integrate Supabase Storage for user profile picture uploads                   | 4h       |

**Deliverables:**

- [ ] `expo-location` permission integration
- [ ] Calendar permission request integration
- [ ] Push notification permission request integration
- [ ] Home location collection form (address, city, postal code, country)
- [ ] MapBox Geocoding API integration for address → coordinates conversion
- [ ] Store home location in `player` table (home_address, home_city, home_postal_code, home_country, home_location, home_location_disclosed)
- [ ] Rating history tracking table and trigger function created
- [ ] Onboarding state persistence
- [ ] PostHog events for onboarding funnel tracking
- [ ] Sentry error tracking configured
- [ ] Profile picture upload to Supabase Storage

### Week 2: Dec 16 - Dec 20, 2025

#### 1.2 Public Player Profile (Read-Only)

| Task                   | Description                                                                 | Estimate |
| ---------------------- | --------------------------------------------------------------------------- | -------- |
| PublicProfileScreen    | Create read-only player profile view accessible by player and others        | 8h       |
| Block Check Logic      | Respect player_blocks - hide blocked players from each other                | 4h       |
| Player Info Display    | Display public player information (player table)                            | 4h       |
| Sport Profiles Display | Display player_sport_profile information                                    | 4h       |
| Rating Display         | Display player_rating_score (public ratings)                                | 4h       |
| Availability Display   | Display player_availability (if public)                                     | 3h       |
| Rating Badges          | Display certification status (self-reported, peer-verified, proof-verified) | 4h       |
| Reputation Gauge       | Visual gauge component (0-100%) with color coding                           | 4h       |
| Favorite/Block Actions | Add/remove favorites, block/unblock from public profile                     | 4h       |

**New Files:**

```
apps/mobile/src/features/players/
├── PublicPlayerProfileScreen.tsx
└── components/
    ├── PlayerInfoSection.tsx
    ├── SportProfilesSection.tsx
    ├── RatingsSection.tsx
    └── AvailabilitySection.tsx
```

**Deliverables:**

- [ ] Read-only public player profile view
- [ ] Respects player_blocks (blocked players hidden)
- [ ] Displays all public player information
- [ ] Favorite and block actions available

#### 1.3 Private User Profile (Editable)

| Task                        | Description                                                                               | Estimate |
| --------------------------- | ----------------------------------------------------------------------------------------- | -------- |
| PrivateProfileScreen        | Create editable profile view accessible only by the user                                  | 8h       |
| Profile Editing             | Enable editing of profile fields with Supabase Storage for images                         | 8h       |
| Player Info Editing         | Edit player table fields                                                                  | 6h       |
| Home Location Editing       | Edit home address fields (address, city, postal code, coordinates, disclosure preference) | 4h       |
| Favorite Facility Selection | Add facility selection for preferred courts                                               | 4h       |
| Play Styles                 | Add play style selection (Aggressive, Defensive, All-Court, etc.) for each sport          | 6h       |
| Play Attributes Editing     | Edit player_play_attributes                                                               | 6h       |
| Sport Profiles Editing      | Edit player_sport_profile                                                                 | 6h       |
| Rating Score Management     | Edit player_rating_score (self-reported ratings)                                          | 4h       |
| Rating History Tracking     | Implement automatic history recording when ratings change                                 | 2h       |
| Availability Management     | Edit player_availability (public/private toggle)                                          | 4h       |
| Rating Proof Management     | Upload/manage rating_proof (video uploads to Backblaze B2)                                | 8h       |
| Rating Requests             | Manage rating_reference_request and peer_rating_request                                   | 6h       |
| Calendar Visibility Toggle  | Public/private calendar setting                                                           | 2h       |
| Profile Picture Management  | Upload, update, delete profile pictures via Supabase Storage                              | 4h       |

**New Files:**

```
apps/mobile/src/features/profile/
├── PrivateProfileScreen.tsx
├── components/
│   ├── ProfileEditForm.tsx
│   ├── PlayerInfoEditForm.tsx
│   ├── HomeLocationEditor.tsx
│   ├── PlayAttributesEditor.tsx
│   ├── SportProfilesEditor.tsx
│   ├── RatingScoreEditor.tsx
│   ├── AvailabilityEditor.tsx
│   ├── RatingProofUploader.tsx
│   └── RatingRequestsManager.tsx
└── hooks/
    └── useProfileEdit.ts
```

**Deliverables:**

- [ ] Private editable profile view (user-only access)
- [ ] Edit all profile and player information
- [ ] Edit home address fields (address, city, postal code, coordinates) with disclosure preference
- [ ] Manage play styles, attributes, and sport profiles
- [ ] Edit ratings with automatic history tracking
- [ ] Upload and manage rating proofs
- [ ] Manage rating reference and peer rating requests

#### 1.4 Settings Screen

| Task                 | Description                                                               | Estimate |
| -------------------- | ------------------------------------------------------------------------- | -------- |
| SettingsScreen       | Create main settings screen with navigation to sub-sections               | 4h       |
| Theme Toggle         | Light/Dark mode toggle with system preference detection and persistence   | 4h       |
| Language Switcher    | FR/EN language switch with i18n integration and persistence               | 4h       |
| Profile Link         | Navigation link to PrivateProfileScreen for editing                       | 1h       |
| Permissions Screen   | Screen to view/manage app permissions (location, calendar, notifications) | 6h       |
| Sign Out             | Sign out functionality with confirmation dialog                           | 2h       |
| Delete Account       | Account deletion flow with confirmation and data cleanup                  | 4h       |
| Settings Persistence | Store user preferences (theme, language) in AsyncStorage + Supabase       | 3h       |

**New Files:**

```
apps/mobile/src/features/settings/
├── SettingsScreen.tsx
├── PermissionsScreen.tsx
├── components/
│   ├── SettingsSection.tsx
│   ├── SettingsRow.tsx
│   ├── ThemeToggle.tsx
│   ├── LanguageSwitcher.tsx
│   ├── SignOutButton.tsx
│   └── DeleteAccountButton.tsx
└── hooks/
    ├── useTheme.ts
    ├── useLanguage.ts
    └── usePermissions.ts
```

**Deliverables:**

- [ ] Settings screen accessible from main navigation
- [ ] Light/Dark mode toggle with persistence (AsyncStorage + profile sync)
- [ ] Language switcher (FR/EN) with i18n integration
- [ ] Link to private profile for editing
- [ ] Permissions management screen (location, calendar, notifications status)
- [ ] Sign out with confirmation dialog
- [ ] Account deletion with confirmation and Supabase data cleanup
- [ ] User preferences synced between device and cloud

### Week 3: Dec 23 - Dec 27, 2025

#### 1.5 Player Directory (Feature #5)

| Task                   | Description                                                        | Estimate |
| ---------------------- | ------------------------------------------------------------------ | -------- |
| PlayerDirectoryScreen  | Create main screen with virtualized list                           | 8h       |
| PlayerCard Component   | Design card showing pic, name, level badge, reputation, distance   | 6h       |
| Filter System          | Build filters: level, location radius, availability, gender, sport | 8h       |
| Location Radius Filter | Implement radius filter with home/current location options         | 6h       |
| Spatial Query Logic    | Build PostGIS queries for distance-based player search             | 4h       |
| Search                 | Implement PostgreSQL Full-Text Search for player name search       | 6h       |
| API Integration        | Connect to Supabase for player data with pagination                | 6h       |
| PostHog Events         | Track player directory views, searches, and profile views          | 2h       |

**New Files:**

```
apps/mobile/src/features/players/
├── PlayerDirectoryScreen.tsx
├── PlayerCard.tsx
├── PlayerFilters.tsx
├── PlayerSearch.tsx
└── index.ts
```

**Deliverables:**

- [ ] Scrollable player directory with infinite scroll
- [ ] Player cards with key info at a glance
- [ ] Multi-filter combination support
- [ ] Location radius filter with home/current location center options
- [ ] PostGIS spatial queries for efficient distance calculations
- [ ] PostgreSQL Full-Text Search for player names
- [ ] Tap to view full profile navigation
- [ ] PostHog analytics events for directory usage

#### 1.6 Player Relations (Feature #6)

**Database Migration Required:**

```sql
-- supabase/migrations/001_add_player_relations.sql

-- Player blocks
CREATE TABLE player_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Player favorites
CREATE TABLE player_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  favorite_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, favorite_id)
);

-- Player groups (max 10 members)
CREATE TABLE player_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES sports(id),
  max_members INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES player_groups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  is_moderator BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, player_id)
);

-- Communities (public, larger groups)
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_by UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  sport_id UUID REFERENCES sports(id),
  is_public BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  member_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  is_moderator BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  joined_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, player_id)
);

-- Private contact lists (for non-app users)
CREATE TABLE private_contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE private_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES private_contact_lists(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Task                  | Description                                  | Estimate |
| --------------------- | -------------------------------------------- | -------- |
| Block Player          | Block/unblock functionality with UI          | 4h       |
| Favorites List        | Add/remove favorites, view favorites screen  | 6h       |
| Player Groups         | Create, edit, delete groups; manage members  | 10h      |
| Communities           | Community listing, join requests, moderation | 12h      |
| Private Contact Lists | Import from contacts, manual entry           | 8h       |

**New Files:**

```
apps/mobile/src/features/relations/
├── BlockedPlayersScreen.tsx
├── FavoritesScreen.tsx
├── GroupsScreen.tsx
├── GroupDetailScreen.tsx
├── CreateGroupOverlay.tsx
├── CommunitiesScreen.tsx
├── CommunityDetailScreen.tsx
├── CreateCommunityOverlay.tsx
├── PrivateContactsScreen.tsx
└── index.ts
```

### Week 3+ (Optional): External Rating API Integration

> **⚠️ OPTIONAL FEATURE** - Implement only if API access is secured for USTA, DUPR, and/or UTR.
> This feature depends on obtaining developer API credentials from third-party rating providers.

#### 1.7 External Rating API Integration (Optional)

**Prerequisites:**

- [ ] USTA Connect API access approved (OAuth2 credentials)
- [ ] DUPR API key obtained
- [ ] UTR API access approved (if available)

**Database Migration Required:**

```sql
-- supabase/migrations/XXX_add_external_rating_accounts.sql

-- Provider enum for external rating systems
CREATE TYPE external_rating_provider_enum AS ENUM (
  'usta',   -- USTA Connect (NTRP ratings)
  'dupr',   -- DUPR (Pickleball & Tennis)
  'utr'     -- Universal Tennis Rating
);

-- Sync status for external accounts
CREATE TYPE external_sync_status_enum AS ENUM (
  'pending',    -- Account linked, awaiting first sync
  'syncing',    -- Sync in progress
  'synced',     -- Successfully synced
  'failed',     -- Sync failed (see error_message)
  'expired'     -- Tokens expired, re-auth required
);

-- External rating accounts (links player to external rating providers)
CREATE TABLE external_rating_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  provider external_rating_provider_enum NOT NULL,

  -- External identity
  external_user_id VARCHAR(100) NOT NULL,  -- UAID for USTA, user ID for DUPR/UTR
  external_username VARCHAR(150),          -- Display name from provider
  external_profile_url TEXT,               -- Link to profile on provider's site

  -- OAuth tokens (encrypted at rest via Supabase Vault)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Sync status
  last_synced_at TIMESTAMPTZ,
  next_sync_after TIMESTAMPTZ,             -- Rate limiting / scheduling
  sync_status external_sync_status_enum NOT NULL DEFAULT 'pending',
  sync_error_message TEXT,
  sync_attempt_count INT NOT NULL DEFAULT 0,

  -- Raw API response (for debugging and data integrity)
  last_api_response JSONB,

  -- Account status
  is_active BOOLEAN NOT NULL DEFAULT true,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlinked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(player_id, provider)
);

-- Indexes for external_rating_accounts
CREATE INDEX idx_external_rating_accounts_player ON external_rating_accounts(player_id);
CREATE INDEX idx_external_rating_accounts_provider ON external_rating_accounts(provider);
CREATE INDEX idx_external_rating_accounts_sync_status ON external_rating_accounts(sync_status)
  WHERE is_active = true;
CREATE INDEX idx_external_rating_accounts_next_sync ON external_rating_accounts(next_sync_after)
  WHERE is_active = true AND sync_status != 'expired';

-- RLS Policies
ALTER TABLE external_rating_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own external accounts"
  ON external_rating_accounts FOR SELECT
  USING (auth.uid() = player_id);

CREATE POLICY "Players can manage their own external accounts"
  ON external_rating_accounts FOR ALL
  USING (auth.uid() = player_id);

-- Function to update player_rating_scores when external rating is synced
CREATE OR REPLACE FUNCTION sync_external_rating_to_player()
RETURNS TRIGGER AS $$
DECLARE
  v_rating_system_id UUID;
  v_rating_score_id UUID;
  v_external_rating NUMERIC;
BEGIN
  -- Only process successful syncs with API response data
  IF NEW.sync_status != 'synced' OR NEW.last_api_response IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extract rating value based on provider
  CASE NEW.provider
    WHEN 'usta' THEN
      v_external_rating := (NEW.last_api_response->>'ntrpRating')::NUMERIC;
      SELECT id INTO v_rating_system_id FROM rating_systems WHERE code = 'NTRP';
    WHEN 'dupr' THEN
      -- Use singles rating by default, could be configurable
      v_external_rating := (NEW.last_api_response->>'singles')::NUMERIC;
      SELECT id INTO v_rating_system_id FROM rating_systems WHERE code = 'DUPR';
    WHEN 'utr' THEN
      v_external_rating := (NEW.last_api_response->>'rating')::NUMERIC;
      SELECT id INTO v_rating_system_id FROM rating_systems WHERE code = 'UTR';
  END CASE;

  -- Find the closest rating_score for this value
  IF v_rating_system_id IS NOT NULL AND v_external_rating IS NOT NULL THEN
    SELECT id INTO v_rating_score_id
    FROM rating_scores
    WHERE rating_system_id = v_rating_system_id
    ORDER BY ABS(value - v_external_rating)
    LIMIT 1;

    -- Upsert player_rating_score with API verification
    IF v_rating_score_id IS NOT NULL THEN
      INSERT INTO player_rating_scores (
        player_id,
        rating_score_id,
        is_certified,
        certified_via,
        certified_at,
        source,
        expires_at,
        notes
      ) VALUES (
        NEW.player_id,
        v_rating_score_id,
        true,
        'external_rating',
        now(),
        NEW.provider || '_api',
        CASE NEW.provider
          WHEN 'usta' THEN (NEW.last_api_response->>'ratingExpiration')::TIMESTAMPTZ
          ELSE now() + INTERVAL '1 year'
        END,
        'Auto-imported from ' || UPPER(NEW.provider::TEXT) || ' API'
      )
      ON CONFLICT (player_id, rating_score_id)
      DO UPDATE SET
        is_certified = true,
        certified_via = 'external_rating',
        certified_at = now(),
        source = NEW.provider || '_api',
        expires_at = EXCLUDED.expires_at,
        notes = EXCLUDED.notes,
        updated_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-sync ratings when external account is updated
CREATE TRIGGER trigger_sync_external_rating
  AFTER UPDATE OF sync_status, last_api_response ON external_rating_accounts
  FOR EACH ROW
  WHEN (NEW.sync_status = 'synced')
  EXECUTE FUNCTION sync_external_rating_to_player();

-- Comments
COMMENT ON TABLE external_rating_accounts IS 'Links players to external rating providers (USTA, DUPR, UTR) for verified rating imports';
COMMENT ON COLUMN external_rating_accounts.external_user_id IS 'Unique identifier on the external platform (UAID for USTA, user ID for DUPR/UTR)';
COMMENT ON COLUMN external_rating_accounts.last_api_response IS 'Raw JSON response from last successful API call for auditing';
```

| Task                    | Description                                                  | Estimate | Depends On         |
| ----------------------- | ------------------------------------------------------------ | -------- | ------------------ |
| External Accounts Table | Create `external_rating_accounts` table and migration        | 2h       | -                  |
| Provider Interface      | Create unified `ExternalRatingProvider` TypeScript interface | 4h       | -                  |
| USTA OAuth Flow         | Implement USTA Connect OAuth2 flow (link account)            | 8h       | USTA API access    |
| USTA Rating Sync        | Fetch and sync NTRP rating from USTA API                     | 4h       | USTA OAuth         |
| DUPR Account Link       | Implement DUPR account linking (API key or OAuth)            | 6h       | DUPR API access    |
| DUPR Rating Sync        | Fetch and sync DUPR rating (singles/doubles)                 | 4h       | DUPR Link          |
| UTR Account Link        | Implement UTR account linking                                | 6h       | UTR API access     |
| UTR Rating Sync         | Fetch and sync UTR rating                                    | 4h       | UTR Link           |
| Link Account UI         | "Link External Ratings" screen with provider selection       | 6h       | Provider Interface |
| Linked Accounts UI      | Display linked accounts with sync status and actions         | 4h       | Link Account UI    |
| Verified Badge UI       | Show "✓ USTA Verified" / "✓ DUPR Verified" badges on ratings | 3h       | Rating Sync        |
| Background Sync Job     | Supabase Edge Function for periodic rating re-sync           | 6h       | All Syncs          |
| Sync Error Handling     | Handle token expiry, API errors, rate limits gracefully      | 4h       | Background Sync    |

**New Files:**

```
packages/shared-services/src/external-ratings/
├── ExternalRatingProvider.ts      # Unified provider interface
├── ExternalRatingService.ts       # Orchestration service
├── providers/
│   ├── USTAProvider.ts            # USTA Connect implementation
│   ├── DUPRProvider.ts            # DUPR implementation
│   └── UTRProvider.ts             # UTR implementation
└── index.ts

apps/mobile/src/features/external-ratings/
├── LinkExternalRatingScreen.tsx   # Provider selection screen
├── LinkedAccountsScreen.tsx       # Manage linked accounts
├── components/
│   ├── ProviderCard.tsx           # Card for each provider
│   ├── LinkAccountButton.tsx      # OAuth/link trigger
│   ├── SyncStatusBadge.tsx        # Shows sync status
│   └── VerifiedRatingBadge.tsx    # "✓ Verified" badge
└── hooks/
    ├── useExternalAccounts.ts     # Fetch linked accounts
    └── useSyncRating.ts           # Trigger manual sync

supabase/functions/
└── sync-external-ratings/
    └── index.ts                   # Background sync Edge Function
```

**Provider-Specific Notes:**

| Provider | Auth Method    | Rating Types                               | API Documentation                      |
| -------- | -------------- | ------------------------------------------ | -------------------------------------- |
| **USTA** | OAuth2 (Auth0) | NTRP (Computer, Appeal, Self, Dynamic)     | https://developer.usta.com/            |
| **DUPR** | API Key        | Singles, Doubles (with reliability scores) | https://backend.mydupr.com/swagger-ui/ |
| **UTR**  | OAuth2 (TBD)   | UTR Singles, Doubles                       | Contact UTR for API access             |

**Trust Hierarchy (for display priority):**

```
1. API-Verified (USTA/DUPR/UTR) → Highest trust, auto-certified, shown as primary
2. Peer-Verified (5+ referrals) → High trust, shown with peer badge
3. Proof-Verified (admin approved) → Medium trust, shown with proof badge
4. Self-Reported → Base trust, no badge
```

**Deliverables (if API access obtained):**

- [ ] `external_rating_accounts` table created with proper indexes and RLS
- [ ] Unified provider interface for consistent API integration
- [ ] USTA Connect OAuth2 flow working (if USTA API access granted)
- [ ] DUPR rating sync working (if DUPR API key obtained)
- [ ] UTR rating sync working (if UTR API access granted)
- [ ] "Link External Ratings" UI in profile settings
- [ ] Verified badges displayed on player ratings
- [ ] Background sync job for automatic rating updates
- [ ] Graceful error handling for API failures and token expiry

---

### Phase 1 Milestone Checklist

- [ ] Players can complete full onboarding with location and home address
- [ ] Players can set and edit their home address fields with disclosure preference
- [ ] Public player profiles are read-only and accessible by all players (respecting blocks)
- [ ] Private user profiles are editable and accessible only by the user
- [ ] Players can edit all profile information (profile, player, home location, play attributes, sport profiles, ratings, availability)
- [ ] Rating changes are automatically tracked in history table for evolution charts
- [ ] Players can upload and manage rating proofs
- [ ] Players can manage rating reference and peer rating requests
- [ ] **Settings screen with theme toggle (light/dark mode)**
- [ ] **Settings screen with language switcher (FR/EN)**
- [ ] **Settings screen with link to private profile for editing**
- [ ] **Settings screen with permissions management (location, calendar, notifications)**
- [ ] **Settings screen with sign out and account deletion options**
- [ ] Players can browse and filter other players by location radius
- [ ] Players can choose home location or current location as search center for radius filters
- [ ] Players can view detailed public profiles with ratings and reputation
- [ ] Players can block, favorite, and organize other players
- [ ] Players can create/join groups and communities
- [ ] Players can maintain private contact lists for non-app users
- [ ] **(Optional)** Players can link USTA/DUPR/UTR accounts for verified ratings

---
