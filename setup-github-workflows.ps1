# GitHub Workflow Setup - Quick Start Script
# Run this in PowerShell from your project root

Write-Host "Setting up GitHub Workflows and Branch Strategy" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-Not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Please run this from project root." -ForegroundColor Red
    exit 1
}

Write-Host "Project root confirmed" -ForegroundColor Green
Write-Host ""

# Step 1: Check current branch
Write-Host "Step 1: Checking current branch..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "   Current branch: $currentBranch" -ForegroundColor White

# Step 2: Ensure we're up to date with main
Write-Host ""
Write-Host "Step 2: Updating main branch..." -ForegroundColor Yellow
git checkout main
git pull origin main
Write-Host "   Main branch updated" -ForegroundColor Green

# Step 3: Create dev branch
Write-Host ""
Write-Host "Step 3: Creating dev branch..." -ForegroundColor Yellow
$devExists = git branch --list dev
if ($devExists) {
    Write-Host "   Dev branch already exists. Checking out..." -ForegroundColor Blue
    git checkout dev
    git pull origin dev
} else {
    Write-Host "   Creating new dev branch from main..." -ForegroundColor White
    git checkout -b dev
    Write-Host "   Dev branch created" -ForegroundColor Green
}

# Step 4: Push dev branch
Write-Host ""
Write-Host "Step 4: Pushing dev branch to remote..." -ForegroundColor Yellow
git push -u origin dev
Write-Host "   Dev branch pushed to GitHub" -ForegroundColor Green

# Step 5: Commit workflow files
Write-Host ""
Write-Host "Step 5: Committing GitHub workflow files..." -ForegroundColor Yellow
git add .github/
git add GITHUB_WORKFLOW_SETUP_GUIDE.md
git status

Write-Host ""
Write-Host "Ready to commit workflow files. Commit now? (Y/N)" -ForegroundColor Cyan
$commit = Read-Host
if ($commit -eq "Y" -or $commit -eq "y") {
    git commit -m "chore: Add GitHub Actions workflows and CI/CD configuration"
    
    git push origin dev
    Write-Host "   Workflow files committed and pushed" -ForegroundColor Green
} else {
    Write-Host "   Skipped commit. You can commit manually later." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "GitHub Workflow Setup Complete!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to GitHub → Settings → Branches" -ForegroundColor White
Write-Host "   Add protection rules for 'dev' and 'main' branches" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Go to Settings → Actions → General" -ForegroundColor White
Write-Host "   Enable 'Read and write permissions' for GITHUB_TOKEN" -ForegroundColor Gray
Write-Host "   Enable 'Allow GitHub Actions to create and approve PRs'" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Create a test feature branch:" -ForegroundColor White
Write-Host "   git checkout -b feature/test-ci-setup" -ForegroundColor Gray
Write-Host "   # Make a small change" -ForegroundColor Gray
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m `"test: Verify CI/CD setup`"" -ForegroundColor Gray
Write-Host "   git push -u origin feature/test-ci-setup" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Create PR on GitHub and verify workflows run" -ForegroundColor White
Write-Host ""
Write-Host "5. Daily auto-merge will run at 11:59 PM UTC" -ForegroundColor White
Write-Host "   (Adjust timezone in .github/workflows/auto-merge-dev-to-main.yml if needed)" -ForegroundColor Gray
Write-Host ""
Write-Host "Full documentation: GITHUB_WORKFLOW_SETUP_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
