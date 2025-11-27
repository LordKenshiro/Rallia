# GitHub Workflow Setup - Quick Reference

## 🎯 What Was Created

✅ **Branch Strategy**: `main` ← `dev` ← `feature/*`
✅ **GitHub Actions Workflows**: 3 automated workflows
✅ **PR Template**: Consistent pull request format
✅ **Setup Script**: PowerShell automation script
✅ **Documentation**: Comprehensive guide

---

## 📁 Files Created

```
.github/
├── workflows/
│   ├── ci.yml                          # Runs on all PRs: lint, type-check, test, build
│   ├── auto-merge-dev-to-main.yml      # Daily auto-merge at 11:59 PM UTC
│   └── welcome-pr.yml                  # Welcomes new PRs with checklist
└── PULL_REQUEST_TEMPLATE.md            # PR description template

GITHUB_WORKFLOW_SETUP_GUIDE.md          # Complete documentation
setup-github-workflows.ps1               # PowerShell setup script
```

---

## ⚡ Quick Start (3 Steps)

### Option A: Automated Setup (Recommended)

```powershell
# Run from project root
cd <PROJECT_ROOT>
.\setup-github-workflows.ps1
```

### Option B: Manual Setup

```powershell
# 1. Create and push dev branch
git checkout main
git pull origin main
git checkout -b dev
git push -u origin dev

# 2. Commit workflow files
git add .github/
git commit -m "chore: Add GitHub Actions workflows and CI/CD configuration"
git push origin dev

# 3. Configure GitHub settings (see below)
```

---

## ⚙️ GitHub Configuration Required

### 1. Branch Protection Rules

Go to: **GitHub → Settings → Branches → Add rule**

#### For `dev` branch:
- Branch name pattern: `dev`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass (lint, type-check, test, build-mobile)
- ✅ Require conversation resolution
- ✅ Do not allow bypassing settings

#### For `main` branch:
- Branch name pattern: `main`
- ✅ Same settings as `dev`

### 2. GitHub Actions Permissions

Go to: **Settings → Actions → General**

- ✅ Read and write permissions
- ✅ Allow GitHub Actions to create and approve pull requests

---

## 🔄 Development Workflow

```
┌─────────────────────────────────────────────────┐
│  1. Create feature branch from dev             │
│     git checkout dev                            │
│     git checkout -b feature/my-feature          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  2. Make changes and commit                     │
│     git add .                                   │
│     git commit -m "feat: Add feature"           │
│     git push -u origin feature/my-feature       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  3. Create PR to dev on GitHub                  │
│     - CI checks run automatically               │
│     - Review (if configured)                    │
│     - Merge when approved & checks pass         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  4. Changes accumulate in dev                   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  5. Auto-merge at 11:59 PM UTC                  │
│     - GitHub Actions checks for changes         │
│     - Creates PR: dev → main                    │
│     - Runs CI checks                            │
│     - Auto-merges if all pass                   │
└─────────────────────────────────────────────────┘
```

---

## 🧪 Testing Your Setup

### Test 1: Create Feature Branch PR

```powershell
git checkout dev
git checkout -b feature/test-ci-setup
echo "# Test" > TEST.md
git add TEST.md
git commit -m "test: Verify CI/CD setup"
git push -u origin feature/test-ci-setup
```

Then:
1. Go to GitHub and create PR: `feature/test-ci-setup` → `dev`
2. Verify CI workflows run (lint, type-check, test, build)
3. Verify welcome message appears
4. Merge when checks pass

### Test 2: Trigger Auto-Merge Manually

1. Go to **Actions** tab on GitHub
2. Select "Auto Merge Dev to Main (Daily)"
3. Click "Run workflow"
4. Select `dev` branch
5. Click "Run workflow" button
6. Verify it creates PR from dev → main

---

## 📊 Workflow Details

### CI Workflow (`ci.yml`)
**Triggers**: PR or push to `dev` or `main`
**Jobs**:
- 🔍 Lint - ESLint checks
- 📝 Type Check - TypeScript validation
- 🧪 Test - Jest tests
- 🏗️ Build - Build mobile app

### Auto-Merge Workflow (`auto-merge-dev-to-main.yml`)
**Triggers**: Daily at 11:59 PM UTC (or manual)
**Logic**:
1. Check if dev has commits ahead of main
2. If yes → Create PR dev → main
3. Enable auto-merge
4. If CI passes → Merge automatically

### Welcome Workflow (`welcome-pr.yml`)
**Triggers**: New PR opened
**Action**: Posts welcome comment with checklist

---

## 🕐 Timezone Adjustment

Default: **11:59 PM UTC**

To adjust for your timezone:

```yaml
# Edit: .github/workflows/auto-merge-dev-to-main.yml

# For EST (UTC-5): 11:59 PM EST = 4:59 AM UTC next day
- cron: '59 4 * * *'

# For PST (UTC-8): 11:59 PM PST = 7:59 AM UTC next day  
- cron: '59 7 * * *'

# For CST (UTC-6): 11:59 PM CST = 5:59 AM UTC next day
- cron: '59 5 * * *'
```

---

## 🔧 Troubleshooting

### Problem: Auto-merge doesn't work

**Solution**: Enable GitHub Actions permissions
- Settings → Actions → General
- Select "Read and write permissions"
- Enable "Allow GitHub Actions to create and approve pull requests"

### Problem: CI checks fail

**Check**:
1. Ensure all workspaces have required scripts in `package.json`
2. Run locally: `npm run lint && npm run type-check && npm run test`
3. Check workflow logs in Actions tab

### Problem: Branch protection blocking merge

**Solution**: 
- Review required status checks in branch protection
- Ensure workflow names match exactly
- Wait for all checks to complete

---

## 📚 Additional Resources

- Full Guide: `GITHUB_WORKFLOW_SETUP_GUIDE.md`
- Monorepo Compliance: `apps/mobile/MONOREPO_COMPLIANCE_AUDIT.md`
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)

---

## ✅ Setup Checklist

- [ ] Dev branch created and pushed
- [ ] Workflow files committed
- [ ] Branch protection configured for `dev`
- [ ] Branch protection configured for `main`
- [ ] GitHub Actions permissions enabled
- [ ] Test PR created and merged
- [ ] CI checks verified working
- [ ] Auto-merge workflow tested

---

**Status**: Ready for implementation
**Estimated Time**: 15-30 minutes
**Support**: See `GITHUB_WORKFLOW_SETUP_GUIDE.md` for detailed help
