In the app, there will be 4 tab screens and 1 central tab button that will open a bottom sheet

Global Sport Context:

- The sport switcher component in the header sets/updates a global sport state
- All resources displayed across screens are filtered by the currently selected sport
- Switching sports refreshes all directory content to show only relevant resources

Bottom Sheet vs Dedicated Screen:

Use Bottom Sheet when:

- Content is a quick preview or summary (< 3 scrollable sections)
- Primary purpose is quick actions (join, message, invite)
- User needs context of parent screen
- Interaction is transactional (confirm, rate, select)

Use Dedicated Screen when:

- Content has multiple complex sections (photos, lists, schedules, stats)
- Content requires extensive scrolling or sub-navigation
- User benefits from full-screen focus
- Content has its own nested drill-downs

Resource Profile Patterns:

- Match → Bottom Sheet (quick preview + join/leave actions)
- Court → Bottom Sheet (simple info for single court)
- Player → Bottom Sheet (quick profile + message/invite actions)
- Share List → Bottom Sheet (simple member list + share actions)
- Group → Bottom Sheet (summary + join/chat actions)
- Community → Dedicated Screen (events, discussions, members require space)
- Tournament → Dedicated Screen (bracket, schedule, participants are complex)
- League → Dedicated Screen (standings, schedule, team stats are complex)
- Facility → Dedicated Screen (photos, info, courts list)
- Peer Rating Form → Bottom Sheet (skill assessment form)
- Rating Reference Form → Bottom Sheet (approve/decline declared rating)
- Rating Proof → Bottom Sheet (single proof viewer with navigation)

Authentication & Onboarding Walls:

Access Levels:

- Guest: Unauthenticated user (no account or not signed in)
- Authenticated: Signed in but onboarding incomplete
- Onboarded: Signed in + completed full onboarding (profile, sport, skill, preferences, availabilities)

Tab-Level Access:

| Tab       | Guest               | Authenticated       | Onboarded   |
| --------- | ------------------- | ------------------- | ----------- |
| Home      | Browse only         | Browse only         | Full access |
| Courts    | Browse only         | Browse only         | Full access |
| Actions   | Opens Sign In flow  | Opens Onboarding    | Full access |
| Community | Browse only         | Browse only         | Full access |
| Chat      | Locked (shows wall) | Locked (shows wall) | Full access |

Browse-Only Mode (Guest & Authenticated):

These screens are fully viewable but all action buttons trigger auth/onboarding walls:

- Home Landing: View match cards, but "Join" opens auth wall
- Player/Public Matches Screens: View lists, but actions blocked
- Facilities Directory & Detail: Browse and view, but "Book Court" blocked
- Player Directory: View player cards, but "Message" / "Invite" blocked
- Groups/Communities/Tournaments/Leagues: Browse directories, view details
- Map Screen: View markers, but tapping for actions triggers wall

Fully Locked Screens (Require Onboarded):

- Chat Stack (Conversations & Chat Screens): Shows a wall with "Sign in to message players"
- Private Writable Player Profile: Redirects to auth flow
- Player Calendar: Redirects to auth flow
- Share Lists Screen: Only accessible when onboarded (user's own lists)

Action Walls:

All actions require Onboarded status. When triggered by Guest/Authenticated, opens Actions Bottom Sheet:

| Action Category    | Examples                                                         |
| ------------------ | ---------------------------------------------------------------- |
| Match Actions      | Join, Leave, Create, Edit, Cancel, Invite players                |
| Social Actions     | Message, Add to share list, Follow, Invite to group              |
| Rating Actions     | Request peer rating, Request reference, Submit rating            |
| Resource Creation  | Create match, group, share list, tournament, league              |
| Engagement Actions | Favorite facility/player, RSVP to event, Register for tournament |
| Profile Actions    | Edit profile, Set availability, Add rating proofs                |

Wall Behavior:

- Guest hits wall → Actions Bottom Sheet opens to Sign In / Sign Up
- Authenticated hits wall → Actions Bottom Sheet opens to continue onboarding step
- Wall includes contextual message: "Sign in to join this match" / "Complete your profile to message players"
- After completing auth/onboarding, user returns to original action context

Header Behavior by Access Level:

| Access Level  | Profile Picture Button | Notifications | Settings |
| ------------- | ---------------------- | ------------- | -------- |
| Guest         | Shows "Sign In" icon   | Hidden        | Hidden   |
| Authenticated | Shows default avatar   | Hidden        | Visible  |
| Onboarded     | Shows user photo       | Visible       | Visible  |

Tabs:

1. Home
2. Courts
3. Actions (opens bottom sheet)
4. Community
5. Chat

Tab Screens:

1. Home Stack
   - Landing Screen
     - Header:
       - Left: Profile picture button, app logo and sports switcher component
       - Right: Notifications + Settings icons
     - Body:
       - Your Matches Section
         - Horizontal scrollable match card list
         - Each card shows: date/time, location, participant count, match status
         - Clicking a card opens Match Profile Bottom Sheet
         - View All button navigates to Player Matches Screen

       - Soon & Nearby Matches Section
         - Vertical infinitely scrollable match card list for public/joinable matches
         - Each card shows: date/time, location, spots available, host info
         - Clicking a card opens Match Profile Bottom Sheet
         - View All button navigates to Public Matches Screen

   - Player Matches Screen
     - Header:
       - Left: Chevron Back Icon
       - Title: Your Games
       - Right: Map + Plus Icons (Plus opens Actions Bottom Sheet)
     - Body:
       - Tabs: Past | Upcoming
       - Search bar
       - Filters: Status (confirmed/pending/cancelled), Date range
       - Sorting: Date, Distance
       - Date-sectioned match list (Today, Tomorrow, This Week, etc.)
       - Each match card opens Match Profile Bottom Sheet when pressed

   - Public Matches Screen
     - Header:
       - Left: Chevron Back Icon
       - Title: Public Games
       - Right: Map + Plus Icons (Plus opens Actions Bottom Sheet)
     - Body:
       - Search bar
       - Filters: Skill level, Date range, Distance, Spots available
       - Sorting: Date, Distance, Popularity
       - Date-sectioned match list
       - Each match card opens Match Profile Bottom Sheet when pressed

2. Courts Stack
   - Facilities Directory Screen
     - Header:
       - Left: Profile picture button, app logo and sports switcher component
       - Right: Map + Notifications + Settings icons
     - Body:
       - Search bar (by facility name or location)
       - Filters: Amenities, Distance, Open now, Favorites, Indoor/Outdoor
       - Sorting: Distance, Rating, Name
       - Facility card list
         - Each card shows: name, photo, court count, distance, rating, open status
         - Clicking a card navigates to Facility Detail Screen

   - Facility Detail Screen
     - Header:
       - Left: Chevron Back Icon
       - Title: Facility Name
       - Right: Favorite + Share icons
     - Body:
       - Photo gallery/carousel
       - Facility info: address, hours, contact, website, amenities
       - Courts section
         - List of courts with: name, surface type, availability indicator
         - Clicking a court opens Court Profile Bottom Sheet
       - Action buttons: Get Directions, Call, Book Court, Share

3. Community Stack
   - Player Directory Screen
     - Header:
       - Left: Profile picture button, app logo and sports switcher component
       - Right: Map + Invitation icons (Invitation opens Actions Bottom Sheet)
     - Body:
       - Horizontal scrollable navigation with round pressables:
         - Share Lists, Groups, Communities, Tournaments, Leagues
       - Player Directory Section
         - Search bar (by name or username)
         - Filters: Skill level, Distance, Availability, Favorites
         - Sorting: Distance, Rating, Name, Recently active
         - Player card list
           - Each card shows: photo, name, skill level, distance
           - Clicking a card opens Player Profile Bottom Sheet with info and actions (message, invite to match, group or community)

   - Share Lists Screen
     - Header:
       - Left: Chevron Back Icon
       - Title: My Share Lists
       - Right: Plus Icon (opens Actions Bottom Sheet)
     - Body:
       - Search bar
       - Sorting: Date created, Name, Member count
       - Share list cards (user's own lists only)
         - Each card shows: name, member count
         - Clicking a card opens Share List Profile Bottom Sheet with members list and actions (edit, share, delete)

   - Groups Screen
     - Header:
       - Left: Chevron Back Icon
       - Title: Groups
       - Right: Plus Icon (opens Actions Bottom Sheet)
     - Body:
       - Search bar
       - Filters: My groups, Public, Private
       - Sorting: Activity, Member count, Name
       - Group cards
         - Each card shows: name, photo, member count, activity status
         - Clicking a card opens Group Profile Bottom Sheet with info, members preview, and actions (join, leave, view chat)

   - Communities Screen
     - Header:
       - Left: Chevron Back Icon
       - Title: Communities
       - Right: Plus Icon (opens Actions Bottom Sheet)
     - Body:
       - Search bar
       - Filters: My communities, Local, Size
       - Sorting: Member count, Activity, Distance
       - Community cards
         - Each card shows: name, photo, member count, location
         - Clicking a card navigates to Community Detail Screen (dedicated screen - complex content)

   - Tournaments Screen
     - Header:
       - Left: Chevron Back Icon
       - Title: Tournaments
       - Right: Plus Icon (opens Actions Bottom Sheet)
     - Body:
       - Search bar
       - Filters: Upcoming, In progress, Past, Entry fee, Skill level
       - Sorting: Start date, Prize pool, Participants
       - Tournament cards
         - Each card shows: name, dates, location, participants/capacity, entry fee
         - Clicking a card navigates to Tournament Detail Screen (dedicated screen - complex content)

   - Leagues Screen
     - Header:
       - Left: Chevron Back Icon
       - Title: Leagues
       - Right: Plus Icon (opens Actions Bottom Sheet)
     - Body:
       - Search bar
       - Filters: Active, Upcoming, Past, Skill level
       - Sorting: Start date, Team count, Name
       - League cards
         - Each card shows: name, season dates, team count, standings preview
         - Clicking a card navigates to League Detail Screen (dedicated screen - complex content)

   - Community Detail Screen (dedicated - complex content)
     - Header:
       - Left: Chevron Back Icon
       - Title: Community Name
       - Right: Share icon
     - Body:
       - Cover photo and community info (description, location, member count)
       - Tabs: About | Events | Discussions | Members
       - Action buttons: Join/Leave, Invite members, Open chat

   - Tournament Detail Screen (dedicated - complex content)
     - Header:
       - Left: Chevron Back Icon
       - Title: Tournament Name
       - Right: Share icon
     - Body:
       - Tournament info header: dates, location, format, entry fee, prize pool
       - Tabs: Bracket | Schedule | Participants | Rules
       - Action buttons: Register/Withdraw, View my matches

   - League Detail Screen (dedicated - complex content)
     - Header:
       - Left: Chevron Back Icon
       - Title: League Name
       - Right: Share icon
     - Body:
       - League info header: season dates, format, team count
       - Tabs: Standings | Schedule | Teams | Stats
       - Action buttons: Join/Leave, View my team, View schedule

4. Chat Stack
   - Conversations Screen
     - Header:
       - Left: Profile picture button, app logo and sports switcher component
       - Right: Compose icon (opens new conversation flow)
     - Body:
       - Search conversations
       - Filter tabs: All, Direct, Matches, Groups
       - Conversation cards
         - Each card shows: avatar(s), name, last message preview, timestamp, unread indicator
         - Clicking a card navigates to Chat Screen

   - Chat Screen
     - Header:
       - Left: Chevron Back Icon
       - Title: Conversation name (player name, match title, or group name)
       - Right: Info icon - opens Chat Info Bottom Sheet with participants and actions (mute, leave, report)
     - Body:
       - Message thread with date separators
       - Message types: text, images, location, match invites
       - Message input with attachment button and send button

Independent Navigator Screens

--- DEDICATED SCREENS ---

1. Map Screen
   - Full-screen map view
   - Toggle layers: Matches, Facilities, Players
   - Map markers with clustering
   - Clicking a marker: Match/Player opens Bottom Sheet, Facility navigates to Facility Detail Screen
   - Search and filter controls
   - Current location button

2. Notifications Screen
   - Notification list grouped by date
   - Types: Match invites, Match updates, Messages, Friend requests, Tournament updates, Rating requests, Rating references
   - Mark as read, Clear all actions
   - Clicking a notification navigates to relevant screen/bottom sheet

3. Settings Screen
   - Account settings: Email, Password, Phone
   - Profile settings: Edit profile, Privacy settings
   - Notification preferences
   - App preferences: Theme, Language, Units
   - Support: Help center, Contact us, Report a bug
   - Legal: Terms of service, Privacy policy
   - Sign out, Delete account

4. Private Writable Player Profile Screen
   - All public profile sections (editable)
   - Edit photo, Edit bio
   - Manage sports and skill levels
   - View and manage calendar/availability
   - Rating Management Section:
     - Peer Ratings:
       - Received peer ratings (ratings others have given you)
       - Pending peer rating requests (requests from others asking you to rate them)
       - Request peer rating (from eligible players who meet conditions)
     - Rating References:
       - Received references (approvals of your declared rating)
       - Pending reference requests (requests from others asking you to approve their declared rating)
       - Request reference (ask eligible players to approve your declared rating)
   - Rating Proofs Section:
     - Add/remove proofs (video, image, document, link)
     - Reorder proofs display priority
     - Each proof shows: type, title, date added, visibility status

5. Player Calendar Screen
   - Monthly/weekly calendar view
   - Shows scheduled matches and availability
   - Set recurring availability
   - Quick match creation from calendar

--- BOTTOM SHEETS ---

6. Actions Bottom Sheet (Auth, Onboarding & Resource Creation)
   - Auth flows: Sign in, Sign up
   - Onboarding: Profile setup, Sport selection, Skill assessment, Preferences & Availabilities
   - Resource creation: Create match, Create conversation, Create group, Create share list, Create tournament, Create league

7. Match Profile Bottom Sheet
   - Match details: Date/time, Location, Rules, Match type
   - Participants list with status (confirmed/pending)
   - Chat preview
   - Action buttons: Join, Leave, Invite players, Edit (if host), Cancel (if host), Get directions

8. Player Profile Bottom Sheet (public view of another player)
   - Profile header: Photo, Name, Username, Bio
   - Skill level: declared rating + reference count (e.g., "4.5 · 3 references")
   - Peer ratings summary (average peer rating, number of ratings)
   - Rating proofs preview (tap to view full proof)
   - Recent activity preview
   - Action buttons: Message, Invite to match, Add to share list
   - Contextual buttons (if applicable):
     - "Rate Player" if they requested a peer rating from you
     - "Approve Rating" if they requested a reference from you

9. Court Profile Bottom Sheet
   - Court info: name, surface type, dimensions
   - Availability schedule
   - Action buttons: Book court, View facility

10. Share List Profile Bottom Sheet
    - List name and member count
    - Members list with quick actions (remove, message)
    - Action buttons: Edit name, Share list, Delete list

11. Group Profile Bottom Sheet
    - Group info: name, description, member count, privacy
    - Members preview (first few members)
    - Action buttons: Join/Leave, Open chat, View members

12. Chat Info Bottom Sheet
    - Participants list
    - Action buttons: Mute, Leave conversation, Report

13. Match Feedback Bottom Sheet
    - Post-match flow
    - Rate the match experience
    - Rate individual players (sportsmanship, skill accuracy)
    - Report issues
    - Share results

14. Match Suggestion Bottom Sheet
    - Intelligent match suggestions based on preferences/availabilities
    - Quick edit actions
    - Confirm match creation

15. Peer Rating Form Bottom Sheet
    - Rater context: Shows who you're rating and your shared history (matches played together, etc.)
    - Skill level assessment (your evaluation of their skill)
    - Sportsmanship rating
    - Optional comment
    - Submit and Cancel actions

16. Rating Reference Form Bottom Sheet
    - Reference context: Shows the player's declared rating that needs approval
    - Approve/Decline the declared rating
    - Optional comment explaining your decision
    - Submit and Cancel actions

17. Rating Proof Viewer Bottom Sheet
    - Proof content display (video player, image viewer, document preview, link preview)
    - Proof metadata: title, date added, added by
    - Navigation: Previous/Next proof arrows
    - Close action
