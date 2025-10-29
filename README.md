# Tennis Matchmaking Platform

This repository contains the full-stack source code for a cross-platform tennis and pickleball matchmaking application. The app enables players to sign up, create and discover matches, book courts, join community groups, chat in real time, and manage payments—all in one unified platform.

## Key Features
- **Multi-device support:** Built with React Native and Expo; deploys to iOS, Android, and the web.
- **Fast onboarding:** Social login with Supabase (email, Google, Apple), detailed profile wizard, and instant language selection.
- **Matchmaking engine:** Create, join, and manage matches with advanced filtering by skill, time, location, and availability.
- **Court booking:** Integrated with club partners for live court schedules and Stripe payments.
- **Community and chat:** Real-time messaging in matches, groups, and club communities using Supabase Realtime.
- **Player reputation:** Detailed feedback after matches, with profile badges for verified skills and conduct.
- **Admin dashboard:** Analytics, CRUD management, and dispute resolution tools for clubs and platform admins.

## Tech Stack
- **Frontend:** React Native (Expo), TypeScript, React Native Paper, Mapbox
- **Backend/Database:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Payments:** Stripe
- **Notifications:** Expo Push, Firebase Cloud Messaging
- **Monitoring:** Sentry, (LogRocket/Datadog optionally)
- **Hosting:** Vercel (web), Expo EAS (app builds)

## Getting Started
See the Setup Guide in [README.md](README.md) for step-by-step instructions on configuring Supabase, Expo, Stripe, Sentry, and local development.

---

**This project aims to make partner finding, match organization, and club management seamless for players and facilities alike**. Contributions, feature requests, and bug reports are welcome via Issues and Pull Requests.
