# Schema Comparison Report

## Phase 1 Schema vs Current Database Types

Generated: $(date)

## Summary

This report compares the required Phase 1 schema (`roadmap/phase_1/schema.sql`) with the current database state reflected in TypeScript types (`packages/shared-types/src/supabase.ts`).

---

## ❌ MISSING TABLES (Required by Phase 1 but not in current DB)

The following tables are defined in Phase 1 schema but are **missing** from the TypeScript types:

1. **`player_block`** - Players can block other players
2. **`player_favorite`** - Players can favorite other players
3. **`player_group`** - Private groups of up to 10 players
4. **`group_member`** - Members of player groups
5. **`community`** - Public or semi-public communities
6. **`community_member`** - Members of communities
7. **`private_contact_list`** - Lists of non-app contacts
8. **`private_contact`** - Individual contacts within lists
9. **`player_rating_score_history`** - Historical snapshots of player rating scores
10. **`external_rating_account`** - Links to external rating providers (OPTIONAL)

---

## ⚠️ TABLE COLUMN DIFFERENCES

### `profile` table

**Missing in TypeScript (but in schema.sql):**

- `locale` (default: 'en-CA')
- `timezone` (default: 'America/Toronto')
- `two_factor_enabled` (default: false)

**Extra in TypeScript (not in schema.sql):**

- `account_status` (enum)
- `email_verified` (boolean)
- `phone_verified` (boolean)
- `onboarding_completed` (boolean)
- `bio` (text)
- `address` (string)
- `city` (string)
- `province` (string)
- `postal_code` (string)
- `country` (string - schema.sql doesn't have this in profile)

**Column name mismatch:**

### `player` table

**Missing in TypeScript (but in schema.sql):**

- `username` (varchar(50), UNIQUE, NOT NULL)
- `bio` (text)
- `reputation_score` (decimal(5,2), default 100)
- `rating_count` (int, default 0)
- `verified` (boolean, default false)
- `calendar_is_public` (boolean, default false)

**Extra in TypeScript (not in schema.sql):**

- `gender` (gender_enum enum) - Note: schema.sql uses `gender_enum` in player table
- `playing_hand` (playing_hand_enum enum)
- `max_travel_distance` (number)
- `notification_match_requests` (boolean)
- `notification_messages` (boolean)
- `notification_reminders` (boolean)
- `privacy_show_age` (boolean)
- `privacy_show_location` (boolean)
- `privacy_show_stats` (boolean)

**Note:** The schema.sql shows `player` table with `gender` (using `gender_enum`) and `playing_hand` (using `playing_hand_enum`). The TypeScript types should use `gender_enum` (with values: 'male', 'female', 'other', 'prefer_not_to_say') and `playing_hand_enum` (with values: 'right', 'left', 'both') to match the schema.

### `sport` table

**Missing in TypeScript (but in schema.sql):**

- `display_name` (varchar) - TypeScript has this
- `icon_url` (varchar) - TypeScript has this

Actually, TypeScript has both `display_name` and `icon_url`, so these match.

---

## ⚠️ ENUM DIFFERENCES

### Missing Enums in TypeScript (but in schema.sql):

1. **`community_member_status_enum`** - Values: 'pending', 'approved', 'rejected'
2. **`external_rating_provider_enum`** - Values: 'usta', 'dupr', 'utr' (OPTIONAL)
3. **`external_sync_status_enum`** - Values: 'pending', 'syncing', 'synced', 'failed', 'expired' (OPTIONAL)

### Enum Value Differences:

**`gender_enum`:**

- Schema.sql defines: `gender_enum` with values: 'M', 'F', 'O', 'prefer_not_to_say'
- Schema.sql uses: `gender_enum` in the `player` table
- TypeScript defines: BOTH `gender_enum` ('M', 'F', 'O', 'prefer_not_to_say') AND `gender_type` ('male', 'female', 'other', 'prefer_not_to_say')
- **RESOLUTION**: Use `gender_enum` with TypeScript values: 'male', 'female', 'other', 'prefer_not_to_say'

**`playing_hand_enum`:**

- Schema.sql defines: `playing_hand_enum` with values: 'right', 'left', 'both'
- Schema.sql uses: `playing_hand_enum` in the `player` table
- TypeScript defines: BOTH `playing_hand_enum` ('right', 'left', 'both') AND `playing_hand` ('left', 'right', 'both')
- **RESOLUTION**: Use `playing_hand_enum` with values: 'right', 'left', 'both' (as defined in schema.sql)

**`facility_type_enum`:**

- Schema.sql values: 'municipal', 'university', 'club', 'school', 'community_club', 'community_center'
- TypeScript values: 'park', 'club', 'indoor_center', 'private', 'other', 'community_club', 'municipal', 'university', 'school', 'community_center'
- **RESOLUTION**: Use union of both sets: 'municipal', 'university', 'club', 'school', 'community_club', 'community_center', 'park', 'indoor_center', 'private', 'other'

**`court_status_enum` (formerly `availability_enum`):**

- Schema.sql defines: `availability_enum` with values: 'available', 'under_maintenance', 'closed', 'reserved'
- TypeScript values: 'available', 'unavailable', 'maintenance', 'reserved', 'under_maintenance', 'closed'
- **RESOLUTION**: Rename to `court_status_enum` and use TypeScript values: 'available', 'unavailable', 'maintenance', 'reserved', 'under_maintenance', 'closed'

---

## ✅ TABLES THAT MATCH (Present in both)

The following tables exist in both schemas and appear to match:

- `admin`
- `organization`
- `organization_member`
- `player_availability`
- `sport`
- `play_style`
- `play_attribute`
- `player_sport_profile`
- `player_play_attribute`
- `rating_system`
- `rating_score`
- `player_rating_score`
- `file`
- `rating_proof`
- `rating_reference_request`
- `peer_rating_request`
- `facility`
- `facility_contact`
- `facility_image`
- `facility_file`
- `facility_sport`
- `court`
- `court_sport`
- `invitation`

---

## ⚠️ TABLES IN TYPESCRIPT BUT NOT IN PHASE 1 SCHEMA

These tables exist in TypeScript but are NOT part of Phase 1 requirements:

- `booking` - Likely from Phase 2 or 3
- `conversation` - Likely from Phase 4
- `conversation_participant` - Likely from Phase 4
- `court_slot` - Likely from Phase 3
- `delivery_attempt` - Likely from Phase 4
- `match` - Likely from Phase 2
- `match_participant` - Likely from Phase 2
- `match_result` - Likely from Phase 2
- `message` - Likely from Phase 4
- `network` - Likely from Phase 4
- `network_member` - Likely from Phase 4
- `network_type` - Likely from Phase 4
- `notification` - Likely from Phase 4
- `player_review` - Likely from Phase 2
- `player_sport` - Different from `player_sport_profile`
- `rating` - Different from `rating_system`
- `reference_request` - Different from `rating_reference_request`
- `report` - Likely from Phase 4
- `verification_code` - Likely from Phase 1 but not in schema.sql
- `waitlist_signup` - Likely pre-MVP

---

## 🔧 RECOMMENDATIONS

### Critical (Must Fix):

1. **Add missing Phase 1 tables:**
   - `player_block`
   - `player_favorite`
   - `player_group`
   - `group_member`
   - `community`
   - `community_member`
   - `private_contact_list`
   - `private_contact`
   - `player_rating_score_history`

2. **Fix `profile` table:**
   - Add missing columns: `locale`, `timezone`, `two_factor_enabled`

3. **Fix `player` table:**
   - Add missing columns: `username`, `bio`, `reputation_score`, `rating_count`, `verified`, `calendar_is_public`
   - Add home address columns: `home_address`, `home_city`, `home_postal_code`, `home_country`, `home_latitude`, `home_longitude`, `home_location`, `home_location_disclosed`
   - Resolve enum type mismatches for `gender` and `playing_hand`

4. **Fix enum mismatches:**
   - Update `gender_enum` to use values: 'male', 'female', 'other', 'prefer_not_to_say' (from `gender_type`)
   - Use `playing_hand_enum` consistently (values: 'right', 'left', 'both')
   - Update `facility_type_enum` to use union of both value sets: 'municipal', 'university', 'club', 'school', 'community_club', 'community_center', 'park', 'indoor_center', 'private', 'other'
   - Rename `availability_enum` to `court_status_enum` and use TypeScript values: 'available', 'unavailable', 'maintenance', 'reserved', 'under_maintenance', 'closed'
   - Add missing enums: `community_member_status_enum`

### Optional (Can defer):

1. **External Rating Integration:**
   - Add `external_rating_account` table
   - Add `external_rating_provider_enum` enum
   - Add `external_sync_status_enum` enum

---

## 📝 NOTES

- The TypeScript types appear to include tables from later phases (Phase 2, 3, 4), which suggests the database may be ahead of Phase 1 requirements.
- Some column differences may be intentional if the schema.sql represents a target state rather than current state.
- The enum naming inconsistencies suggest the database may have evolved differently than the schema documentation.
