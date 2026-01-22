## Phase 5: Polish & Launch Prep

**Duration:** 2 weeks  
**Dates:** March 16 - March 27, 2026

### Week 15: Mar 16 - Mar 20, 2026

#### 5.1 Bilingualism

| Task                         | Description                       | Estimate |
| ---------------------------- | --------------------------------- | -------- |
| French Translations - Mobile | Complete i18n for mobile app      | 12h      |
| French Translations - Web    | Complete i18n for web app         | 8h       |
| Bilingual Notifications      | Email/SMS/push in user's language | 6h       |
| Language Persistence         | Remember user language preference | 2h       |

**Translation Files:**

```
apps/mobile/src/i18n/
├── en.json
└── fr.json

apps/web/messages/
├── en.json
└── fr.json
```

#### 5.2 Testing & QA

| Task                   | Description                                | Estimate |
| ---------------------- | ------------------------------------------ | -------- |
| E2E Tests - Onboarding | Detox tests for onboarding flow            | 8h       |
| E2E Tests - Match Flow | Detox tests for match creation/acceptance  | 8h       |
| E2E Tests - Chat       | Detox tests for chat functionality         | 4h       |
| Performance Audit      | Identify and fix performance issues        | 8h       |
| Sentry Setup           | Configure Sentry for production monitoring | 4h       |
| PostHog Health Checks  | Verify analytics events firing correctly   | 4h       |
| Supabase Monitoring    | Review Vercel & Supabase dashboards        | 2h       |

### Week 16: Mar 23 - Mar 27, 2026

#### 5.2 Testing & QA (continued)

| Task           | Description                                  | Estimate |
| -------------- | -------------------------------------------- | -------- |
| Security Audit | Review Supabase RLS, auth, data access, chat | 8h       |
| Bug Fixes      | Address issues found in testing              | 16h      |
| Load Testing   | Test with simulated users                    | 4h       |
| Sentry Review  | Review Sentry error reports                  | 2h       |
| PostHog Review | Review PostHog data quality                  | 2h       |

#### 5.3 App Store Preparation

| Task              | Description                               | Estimate |
| ----------------- | ----------------------------------------- | -------- |
| App Store Assets  | Screenshots, descriptions, keywords       | 8h       |
| Play Store Assets | Screenshots, descriptions, keywords       | 8h       |
| Privacy Policy    | Draft and publish privacy policy          | 4h       |
| Terms of Service  | Draft and publish ToS                     | 4h       |
| TestFlight Setup  | Configure Expo EAS Build for beta         | 2h       |
| Play Store Beta   | Configure Expo EAS Build internal testing | 2h       |
| CI/CD Setup       | GitHub Actions + Expo EAS workflows       | 4h       |
| Vercel Deployment | Configure Vercel for web app              | 2h       |

### Phase 5 Milestone Checklist

- [ ] App is fully bilingual (French/English)
- [ ] All notifications respect user language
- [ ] E2E tests pass for critical flows
- [ ] Performance is acceptable
- [ ] Security audit complete
- [ ] App store assets ready
- [ ] Privacy policy and ToS published
- [ ] Beta testing configured

---
