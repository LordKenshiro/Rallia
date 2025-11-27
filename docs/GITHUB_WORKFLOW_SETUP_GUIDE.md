# GitHub Workflow & CI/CD Strategy

## Date: November 23, 2025

## Project: Rallia - React Native Monorepo

---

## 🎯 Your Requirements

1. ✅ Create `dev` branch
2. ✅ Enforce Pull Request (PR) logic before merging to `dev`
3. ✅ Auto-merge `dev` → `main` daily if changes exist
4. ❓ Additional CI/CD needs?

---

## 📋 Recommended GitHub Strategy

### Branch Strategy

```
main (production)
  ↑
  │ (auto-merge daily if tests pass)
  │
dev (development)
  ↑
  │ (PR required)
  │
feature/* (feature branches)
```

### Workflow Overview

1. **Developers** create feature branches from `dev`
2. **Pull Requests** required to merge into `dev` (with reviews + checks)
3. **Automated Daily Merge** from `dev` → `main` at end of day (if tests pass)
4. **CI/CD Checks** run on all PRs and merges

---

## 🔧 Step-by-Step Implementation

### STEP 1: Create and Push Dev Branch

```bash
# Navigate to your project
cd "c:\Users\kenmo\Documents\Version Finale Rallia\Rallia"

# Make sure you're on main and up to date
git checkout main
git pull origin main

# Create dev branch from main
git checkout -b dev

# Push dev branch to GitHub
git push -u origin dev
```

---

### STEP 2: Set Up Branch Protection Rules

Go to GitHub: `Settings` → `Branches` → `Add branch protection rule`

#### For `dev` branch:

**Branch name pattern**: `dev`

**Settings to enable**:

- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1 (or 0 if you're solo developer)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (optional)
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Status checks (will be available after workflows run):
    - `lint`
    - `type-check`
    - `test`
    - `build-mobile`
- ✅ **Require conversation resolution before merging**

- ✅ **Require linear history** (optional, keeps clean history)

- ✅ **Do not allow bypassing the above settings** (even for admins)

#### For `main` branch:

**Branch name pattern**: `main`

**Settings to enable**:

- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1 (can be auto-approved by GitHub Actions)
- ✅ **Require status checks to pass before merging**
  - Status checks:
    - `lint`
    - `type-check`
    - `test`
    - `build-mobile`
- ✅ **Do not allow bypassing the above settings**

---

### STEP 3: Create GitHub Actions Workflows

Create these files in your repository:

#### File 1: `.github/workflows/ci.yml`

**Purpose**: Run on all PRs and pushes to validate code quality

```yaml
name: CI - Lint, Type Check, Test, Build

on:
  pull_request:
    branches: [dev, main]
  push:
    branches: [dev, main]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

  type-check:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run TypeScript type checking
        run: npm run type-check

  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test
        # If you don't have tests yet, use: npm run test -- --passWithNoTests

  build-mobile:
    name: Build Mobile App
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build mobile app
        run: npm run build --workspace=apps/mobile
        # Or if using turbo: npx turbo run build --filter=mobile
```

#### File 2: `.github/workflows/auto-merge-dev-to-main.yml`

**Purpose**: Automatically merge `dev` → `main` daily at end of day

```yaml
name: Auto Merge Dev to Main (Daily)

on:
  schedule:
    # Runs at 11:59 PM UTC every day (adjust timezone as needed)
    # For EST: 11:59 PM EST = 4:59 AM UTC next day
    - cron: '59 23 * * *' # 11:59 PM UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  check-and-merge:
    name: Check for changes and merge dev to main
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Fetch all history
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Git
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Check if dev has changes compared to main
        id: check_changes
        run: |
          git fetch origin main
          git fetch origin dev

          # Check if dev has commits ahead of main
          COMMITS_AHEAD=$(git rev-list --count origin/main..origin/dev)
          echo "commits_ahead=$COMMITS_AHEAD" >> $GITHUB_OUTPUT

          if [ "$COMMITS_AHEAD" -gt 0 ]; then
            echo "✅ Dev branch has $COMMITS_AHEAD commits ahead of main"
            echo "has_changes=true" >> $GITHUB_OUTPUT
          else
            echo "ℹ️ Dev branch has no new changes"
            echo "has_changes=false" >> $GITHUB_OUTPUT
          fi

      - name: Create Pull Request from dev to main
        if: steps.check_changes.outputs.has_changes == 'true'
        id: create_pr
        uses: repo-sync/pull-request@v2
        with:
          source_branch: dev
          destination_branch: main
          pr_title: '🚀 Daily Auto-Merge: Dev → Main'
          pr_body: |
            ## Automated Daily Merge

            This PR was automatically created by GitHub Actions to merge the latest changes from `dev` into `main`.

            **Changes**: ${{ steps.check_changes.outputs.commits_ahead }} commits
            **Triggered**: Scheduled daily merge (end of day)
            **Date**: ${{ github.event.repository.updated_at }}

            ### ✅ Pre-merge Checklist
            - All CI checks must pass
            - No merge conflicts
            - Code review (optional based on settings)

            ---
            *This PR will auto-merge once all checks pass.*
          github_token: ${{ secrets.GITHUB_TOKEN }}
          pr_label: 'auto-merge,daily-release'

      - name: Enable auto-merge
        if: steps.check_changes.outputs.has_changes == 'true' && steps.create_pr.outputs.pr_number != ''
        run: |
          gh pr merge ${{ steps.create_pr.outputs.pr_number }} \
            --auto \
            --squash \
            --delete-branch=false
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: No changes to merge
        if: steps.check_changes.outputs.has_changes == 'false'
        run: |
          echo "ℹ️ No changes detected in dev branch. Skipping merge."
```

#### File 3: `.github/workflows/welcome-pr.yml` (Optional - Nice to have)

**Purpose**: Welcome message on new PRs with checklist

```yaml
name: PR Welcome & Checklist

on:
  pull_request:
    types: [opened]

jobs:
  welcome:
    name: Welcome PR
    runs-on: ubuntu-latest
    steps:
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `👋 Thanks for opening this Pull Request!

            ## 📋 PR Checklist

            Please ensure your PR meets these requirements:

            - [ ] Code follows project style guidelines (ESLint passing)
            - [ ] TypeScript types are correct (type-check passing)
            - [ ] All tests pass
            - [ ] Code builds successfully
            - [ ] Branch is up to date with \`dev\`
            - [ ] Changes are documented (if needed)
            - [ ] No merge conflicts

            ## 🤖 Automated Checks

            The following checks will run automatically:
            - ✅ Linting (ESLint)
            - ✅ Type checking (TypeScript)
            - ✅ Tests (Jest)
            - ✅ Build (Mobile app)

            Once all checks pass and review is approved, your PR can be merged!`
            })
```

---

### STEP 4: Update package.json Scripts

Add these scripts to your root `package.json`:

```json
{
  "scripts": {
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "test": "turbo run test",
    "build": "turbo run build",
    "ci": "npm run lint && npm run type-check && npm run test && npm run build"
  }
}
```

And ensure each workspace has these scripts in their `package.json`:

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "test": "jest --passWithNoTests",
    "build": "tsc"
  }
}
```

---

### STEP 5: Create .github/PULL_REQUEST_TEMPLATE.md

**Purpose**: Consistent PR descriptions

```markdown
## Description

<!-- Describe your changes in detail -->

## Type of Change

<!-- Mark with an 'x' -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Performance improvement
- [ ] Configuration change

## Related Issue

<!-- Link to the issue if applicable -->

Closes #(issue number)

## Testing

<!-- Describe how you tested your changes -->

- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Added unit tests
- [ ] All existing tests pass

## Screenshots (if applicable)

<!-- Add screenshots to help explain your changes -->

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] No merge conflicts with target branch
```

---

## 🚀 Additional CI/CD Recommendations

### 1. **Code Quality Gates** ✅ INCLUDED

Already covered in workflows above:

- ESLint
- TypeScript type checking
- Tests
- Build verification

### 2. **Automated Versioning** 📦 RECOMMENDED

Add semantic versioning automation:

**File**: `.github/workflows/version-bump.yml`

```yaml
name: Version Bump

on:
  push:
    branches: [main]

jobs:
  version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Bump version
        uses: phips28/gh-action-bump-version@master
        with:
          tag-prefix: 'v'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 3. **Mobile Build & Deploy** 📱 RECOMMENDED

For React Native + Expo:

**File**: `.github/workflows/eas-build.yml`

```yaml
name: EAS Build (Production)

on:
  push:
    branches: [main]
    tags:
      - 'v*'

jobs:
  build:
    name: Build with EAS
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Build on EAS
        working-directory: apps/mobile
        run: eas build --platform all --non-interactive --no-wait
```

### 4. **Dependency Updates** 🔄 RECOMMENDED

Auto-update dependencies with Dependabot:

**File**: `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
    reviewers:
      - 'LordKenshiro'
    labels:
      - 'dependencies'
      - 'automated'
```

### 5. **Code Coverage** 📊 OPTIONAL

Track test coverage:

```yaml
# Add to ci.yml test job
- name: Generate coverage report
  run: npm run test -- --coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
```

### 6. **Security Scanning** 🔒 RECOMMENDED

**File**: `.github/workflows/security.yml`

```yaml
name: Security Scan

on:
  push:
    branches: [dev, main]
  pull_request:
    branches: [dev, main]
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## 📊 Recommended CI/CD Priority Matrix

### ✅ MUST HAVE (Implement Now)

1. ✅ Branch protection rules
2. ✅ PR requirements
3. ✅ Lint + Type check + Test + Build on PRs
4. ✅ Auto-merge dev → main (daily)

### 🎯 SHOULD HAVE (Implement Soon)

5. 📦 Automated versioning
6. 🔒 Security scanning (npm audit)
7. 📱 EAS Build for mobile releases
8. 🔄 Dependabot for dependency updates

### 💡 NICE TO HAVE (Future)

9. 📊 Code coverage tracking
10. 🎨 Visual regression testing
11. 📈 Performance monitoring
12. 🌍 Deploy preview environments

---

## 🛠️ Complete Implementation Steps

### Step-by-Step Execution:

```powershell
# 1. Navigate to project
cd "c:\Users\kenmo\Documents\Version Finale Rallia\Rallia"

# 2. Create dev branch
git checkout main
git pull origin main
git checkout -b dev
git push -u origin dev

# 3. Create .github directory structure
mkdir -p .github/workflows
New-Item -ItemType Directory -Path ".github\workflows" -Force

# 4. Create workflow files (copy content from above)
# Create each .yml file in .github/workflows/

# 5. Create PR template
New-Item -ItemType Directory -Path ".github" -Force
# Create PULL_REQUEST_TEMPLATE.md with content above

# 6. Update package.json scripts
# Add the scripts mentioned in Step 4

# 7. Commit and push workflows
git add .github/
git add package.json
git commit -m "chore: Add GitHub Actions workflows and CI/CD configuration"
git push origin dev

# 8. Create first PR to test
git checkout -b feature/test-ci-setup
# Make a small change
git add .
git commit -m "test: Verify CI/CD setup"
git push -u origin feature/test-ci-setup

# 9. Go to GitHub and:
#    - Set up branch protection rules (Step 2)
#    - Create PR from feature/test-ci-setup to dev
#    - Verify workflows run
#    - Merge PR

# 10. After 11:59 PM, verify auto-merge workflow runs
```

---

## 🎓 Workflow Summary

### Daily Development Flow:

```
1. Developer creates feature branch from dev
   git checkout dev
   git pull origin dev
   git checkout -b feature/my-feature

2. Developer makes changes and commits
   git add .
   git commit -m "feat: Add new feature"
   git push -u origin feature/my-feature

3. Developer creates PR to dev
   - CI checks run automatically
   - Review required (if configured)
   - Merge when approved & checks pass

4. Changes accumulate in dev throughout day

5. At 11:59 PM, GitHub Actions:
   - Checks if dev has changes
   - Creates PR: dev → main
   - Runs all CI checks
   - Auto-merges if checks pass
   - main branch updated automatically
```

---

## ⚠️ Important Notes

### 1. **GitHub Token Permissions**

The workflows use `GITHUB_TOKEN` which has limited permissions. For auto-merge to work:

**Option A**: Use default GITHUB_TOKEN (easier)

- Go to `Settings` → `Actions` → `General`
- Under "Workflow permissions", select:
  - ✅ "Read and write permissions"
  - ✅ "Allow GitHub Actions to create and approve pull requests"

**Option B**: Create Personal Access Token (more control)

- Create PAT with `repo` and `workflow` scopes
- Add as secret: `Settings` → `Secrets` → `Actions` → `New repository secret`
- Name it `PAT_TOKEN`
- Update workflow to use `${{ secrets.PAT_TOKEN }}`

### 2. **Timezone Adjustment**

The cron schedule is in UTC. Adjust for your timezone:

```yaml
# For EST (UTC-5): 11:59 PM EST = 4:59 AM UTC next day
- cron: '59 4 * * *'

# For PST (UTC-8): 11:59 PM PST = 7:59 AM UTC next day
- cron: '59 7 * * *'

# For your current (UTC): 11:59 PM UTC
- cron: '59 23 * * *'
```

### 3. **Testing Workflows**

Test workflows manually before relying on them:

```bash
# Trigger workflow manually (if workflow_dispatch enabled)
# Go to Actions tab → Select workflow → Run workflow
```

---

## ✅ Final Checklist

Before considering setup complete:

- [ ] `dev` branch created and pushed
- [ ] Branch protection rules configured for `dev` and `main`
- [ ] All workflow files created in `.github/workflows/`
- [ ] PR template created
- [ ] `package.json` scripts updated
- [ ] GitHub Actions permissions configured
- [ ] Test PR created and merged successfully
- [ ] CI checks running on PRs
- [ ] Auto-merge scheduled (wait until 11:59 PM to verify)

---

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Turborepo CI/CD](https://turbo.build/repo/docs/ci)
- [EAS Build with GitHub Actions](https://docs.expo.dev/build/building-on-ci/)

---

**Status**: 📋 Ready for Implementation
**Estimated Setup Time**: 30-45 minutes
**Complexity**: Moderate
**Priority**: High (before team expansion)
