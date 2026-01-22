# Court Discovery

## Overview

Help players find tennis and pickleball courts near them.

## Discovery Methods

### Map View

Interactive map showing:

- All courts in visible area
- Pins colored by type (public/private)
- Tap pin to see details
- Cluster nearby courts

```
┌─────────────────────────────────────────┐
│ [Interactive Map]                       │
│                                         │
│     📍 Parc Jarry                       │
│            📍 Club XYZ                  │
│                    📍 Municipal         │
│  📍 Community Center                    │
│                                         │
│ [List View] [Filters]                   │
└─────────────────────────────────────────┘
```

### List View

Scrollable list sorted by distance:

```
┌─────────────────────────────────────────┐
│ Courts Near You                         │
├─────────────────────────────────────────┤
│ 📍 Parc Jarry Tennis Courts    0.5km    │
│    Public • 6 courts • Hard             │
│    [View] [Book]                        │
├─────────────────────────────────────────┤
│ 📍 Club Montreal Tennis        1.2km    │
│    Private • 4 courts • Clay            │
│    [View] [Book]                        │
└─────────────────────────────────────────┘
```

## Filters

| Filter       | Options                   |
| ------------ | ------------------------- |
| Sport        | Tennis, Pickleball        |
| Distance     | Slider (1km - 50km)       |
| Court Type   | Public, Private, Both     |
| Surface      | Hard, Clay, Grass, Indoor |
| Availability | Now, Today, This week     |
| Price        | Free, Paid, Any           |

## Court Details

### Court Card

```
┌─────────────────────────────────────────┐
│ [Photos]                                │
│                                         │
│ Parc Jarry Tennis Courts                │
│ 📍 1234 Rue Jarry, Montreal             │
│ 📞 514-555-0123                         │
│                                         │
│ 🎾 6 Tennis Courts                      │
│ Surface: Hard (outdoor)                 │
│ Lighting: Yes                           │
│                                         │
│ Hours: 7am - 10pm                       │
│ Price: Free (city courts)               │
│                                         │
│ Booking: Via Loisirs Montreal           │
│                                         │
│ [Book Now] [Get Directions] [Save]      │
└─────────────────────────────────────────┘
```

### Information Displayed

| Field            | Source                          |
| ---------------- | ------------------------------- |
| Name             | Database                        |
| Address          | Database                        |
| Contact          | Database (if available)         |
| Number of courts | Database                        |
| Surface type     | Database                        |
| Indoor/Outdoor   | Database                        |
| Lighting         | Database                        |
| Hours            | Database or external system     |
| Price            | External system or manual entry |
| Booking method   | Integration type                |

## Saving Courts

### Favorite Courts

Players can save courts to favorites:

1. Tap "Save" on court card
2. Court added to Favorite Courts list
3. Quick access when creating matches

### Favorite Court (Onboarding)

During onboarding, players set a favorite court:

- Used as default for match creation
- Can be changed anytime

## Search

Search by:

- Court name
- Address
- City/neighborhood

## Court Suggestions

Based on:

- Location
- Match history
- Saved favorites
- Other players' patterns (anonymized)
