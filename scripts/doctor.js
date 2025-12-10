#!/usr/bin/env node

/**
 * Doctor Script - Development Environment Health Check
 *
 * Verifies that the development environment is properly set up.
 *
 * Usage: node scripts/doctor.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log();
  log(`━━━ ${title} ━━━`, 'cyan');
}

/**
 * Run a command and return the output
 */
function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

/**
 * Compare semver versions
 */
function compareVersions(current, required) {
  const parse = v =>
    v
      .replace(/[^\d.]/g, '')
      .split('.')
      .map(Number);
  const curr = parse(current);
  const req = parse(required);

  for (let i = 0; i < Math.max(curr.length, req.length); i++) {
    const c = curr[i] || 0;
    const r = req[i] || 0;
    if (c > r) return 1;
    if (c < r) return -1;
  }
  return 0;
}

/**
 * Check a single requirement
 */
function check(name, command, minVersion, installHint) {
  const version = runCommand(command);

  if (!version) {
    return {
      name,
      status: 'missing',
      message: `Not installed`,
      hint: installHint,
    };
  }

  if (minVersion && compareVersions(version, minVersion) < 0) {
    return {
      name,
      status: 'outdated',
      message: `${version} (requires ${minVersion}+)`,
      hint: installHint,
    };
  }

  return {
    name,
    status: 'ok',
    message: version,
  };
}

/**
 * Check if a file/directory exists
 */
function checkPath(name, relativePath, hint) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  const exists = fs.existsSync(fullPath);

  return {
    name,
    status: exists ? 'ok' : 'missing',
    message: exists ? 'Found' : 'Not found',
    hint: exists ? undefined : hint,
  };
}

/**
 * Main execution
 */
function main() {
  log('\n🩺 Development Environment Doctor\n', 'bold');

  const results = [];

  // System requirements
  logSection('System Requirements');

  results.push(
    check('Node.js', 'node --version', '18.0.0', 'Install from https://nodejs.org or use nvm')
  );

  results.push(
    check('npm', 'npm --version', '9.0.0', 'Comes with Node.js, or run: npm install -g npm')
  );

  results.push(check('Git', 'git --version', '2.0.0', 'Install from https://git-scm.com'));

  // Print system results
  results.forEach(r => {
    const icon = r.status === 'ok' ? '✓' : r.status === 'outdated' ? '⚠' : '✗';
    const color = r.status === 'ok' ? 'green' : r.status === 'outdated' ? 'yellow' : 'red';
    log(`  ${icon} ${r.name}: ${r.message}`, color);
  });

  // Optional tools
  logSection('Optional Tools');

  const optionalTools = [
    check(
      'Watchman',
      'watchman --version',
      null,
      'brew install watchman (improves Metro performance)'
    ),
    check('Supabase CLI', 'supabase --version', null, 'brew install supabase/tap/supabase'),
    check('EAS CLI', 'eas --version', null, 'npm install -g eas-cli (for Expo builds)'),
  ];

  optionalTools.forEach(r => {
    const icon = r.status === 'ok' ? '✓' : '○';
    const color = r.status === 'ok' ? 'green' : 'dim';
    log(`  ${icon} ${r.name}: ${r.message}`, color);
  });

  // Mobile development (platform-specific)
  logSection('Mobile Development');

  const isMac = process.platform === 'darwin';

  if (isMac) {
    const xcodeCheck = check('Xcode', 'xcodebuild -version', null, 'Install from App Store');
    const icon = xcodeCheck.status === 'ok' ? '✓' : '○';
    const color = xcodeCheck.status === 'ok' ? 'green' : 'dim';
    log(`  ${icon} Xcode: ${xcodeCheck.message}`, color);

    const cocoapodsCheck = check('CocoaPods', 'pod --version', null, 'sudo gem install cocoapods');
    const podIcon = cocoapodsCheck.status === 'ok' ? '✓' : '○';
    const podColor = cocoapodsCheck.status === 'ok' ? 'green' : 'dim';
    log(`  ${podIcon} CocoaPods: ${cocoapodsCheck.message}`, podColor);
  } else {
    log('  ○ iOS development requires macOS', 'dim');
  }

  const androidCheck = runCommand('echo $ANDROID_HOME') || runCommand('echo %ANDROID_HOME%');
  if (androidCheck && fs.existsSync(androidCheck)) {
    log('  ✓ Android SDK: Found', 'green');
  } else {
    log('  ○ Android SDK: Not configured (set ANDROID_HOME)', 'dim');
  }

  // Project setup
  logSection('Project Setup');

  const projectChecks = [
    checkPath('node_modules', 'node_modules', 'Run: npm install'),
    checkPath('Turbo cache', 'node_modules/.cache/turbo', 'Run: npm run build'),
  ];

  projectChecks.forEach(r => {
    results.push(r);
    const icon = r.status === 'ok' ? '✓' : '✗';
    const color = r.status === 'ok' ? 'green' : 'red';
    log(`  ${icon} ${r.name}: ${r.message}`, color);
  });

  // Git hooks
  const huskyCheck = checkPath('Git hooks (Husky)', '.husky/_/husky.sh', 'Run: npm run prepare');
  const huskyIcon = huskyCheck.status === 'ok' ? '✓' : '○';
  const huskyColor = huskyCheck.status === 'ok' ? 'green' : 'yellow';
  log(
    `  ${huskyIcon} Git hooks: ${huskyCheck.status === 'ok' ? 'Installed' : 'Not installed'}`,
    huskyColor
  );

  // Environment files
  logSection('Environment Files');

  const envChecks = [
    checkPath('.env (root)', '.env', 'Copy from .env.example'),
    checkPath('.env.local (web)', 'apps/web/.env.local', 'Copy from .env.example'),
    checkPath('.env (mobile)', 'apps/mobile/.env', 'Copy from .env.example'),
  ];

  envChecks.forEach(r => {
    const icon = r.status === 'ok' ? '✓' : '⚠';
    const color = r.status === 'ok' ? 'green' : 'yellow';
    log(`  ${icon} ${r.name}: ${r.message}`, color);
  });

  // Summary
  logSection('Summary');

  const critical = results.filter(r => r.status === 'missing' || r.status === 'outdated');

  if (critical.length === 0) {
    log('  ✓ Your development environment is ready! 🎉', 'green');
    process.exit(0);
  } else {
    log(`  Found ${critical.length} issue(s) to fix:\n`, 'yellow');
    critical.forEach((r, i) => {
      log(`  ${i + 1}. ${r.name}`, 'yellow');
      if (r.hint) log(`     ${r.hint}`, 'dim');
    });
    process.exit(1);
  }
}

main();
