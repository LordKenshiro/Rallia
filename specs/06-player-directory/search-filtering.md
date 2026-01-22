# Search & Filtering

## Overview

Players can search and filter the directory to find suitable opponents.

## Search

### Text Search

Search by:

- Player name
- City/location

### Location Search

- Search by city name
- Search by postal code
- Use current location

## Filter Options

### Skill Level

| Filter         | Options                                                           |
| -------------- | ----------------------------------------------------------------- |
| Minimum Level  | Slider or picker (1.0 - 7.0 for Tennis, 2.0 - 8.0 for Pickleball) |
| Maximum Level  | Slider or picker                                                  |
| Certified Only | Toggle (show only certified players)                              |

### Reputation

| Filter               | Options            |
| -------------------- | ------------------ |
| Minimum Reputation   | Slider (0% - 100%) |
| High Reputation Only | Toggle (≥ 90%)     |

### Location

| Filter   | Options              |
| -------- | -------------------- |
| Distance | Slider (1km - 50km+) |
| City     | Dropdown or search   |

### Availability

| Filter      | Options                     |
| ----------- | --------------------------- |
| Day of Week | Multi-select checkboxes     |
| Time of Day | Morning, Afternoon, Evening |

### Other

| Filter         | Options               |
| -------------- | --------------------- |
| Gender         | Male, Female, Any     |
| Handedness     | Right, Left, Any      |
| Match Interest | Match, Practice, Both |

## Saved Filters

Allow users to save custom filter combinations:

1. Configure filters
2. Tap "Save Filter Set"
3. Name the filter set (e.g., "Weekend doubles partners")
4. Access saved filters from dropdown

## Default View

The default directory view should be:

- Filtered by current sport
- Sorted by proximity
- Matching user's preferences (from onboarding)

## Sort Options

| Sort By         | Description                |
| --------------- | -------------------------- |
| Distance        | Nearest first              |
| Skill Level     | Closest to user's level    |
| Reputation      | Highest reputation first   |
| Recently Active | Most recently active first |
| New Members     | Newest members first       |

## Results Display

### List View (Default)

Scrollable list of player cards with key info visible.

### Map View

Interactive map showing player locations:

- Pins for each player
- Tap pin to see player card
- Cluster nearby players
- Filter controls overlay

## Empty States

| Scenario           | Message                                                                |
| ------------------ | ---------------------------------------------------------------------- |
| No results         | "No players found matching your criteria. Try adjusting your filters." |
| No players in area | "Be the first in your area! Invite friends to join Rallia."            |
