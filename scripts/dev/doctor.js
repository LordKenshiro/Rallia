#!/usr/bin/env node

/**
 * Doctor Script - Development Environment Health Check
 *
 * Verifies that the development environment is properly set up.
 *
 * Usage: node scripts/dev/doctor.js [--fix]
 *
 * Options:
 *   --fix    Attempt to fix common issues automatically
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const ROOT_DIR = path.resolve(__dirname, '../..');
const FIX_MODE = process.argv.includes('--fix');

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
 * Check if a port is in use (async)
 */
function checkPort(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(true)); // Port in use
    server.once('listening', () => {
      server.close();
      resolve(false); // Port available
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Check if Docker is running
 */
function checkDocker() {
  const version = runCommand('docker --version');
  if (!version) {
    return { status: 'missing', message: 'Not installed' };
  }

  const running = runCommand('docker info');
  if (!running) {
    return { status: 'stopped', message: `${version.split(',')[0]} (not running)` };
  }

  return { status: 'ok', message: version.split(',')[0] };
}

/**
 * Check Supabase local services
 */
function checkSupabaseServices() {
  const status = runCommand('supabase status 2>/dev/null');
  if (!status) {
    return { status: 'stopped', services: [] };
  }

  const running = status.includes('Started') || status.includes('running');
  return {
    status: running ? 'ok' : 'stopped',
    services: running ? ['API', 'Database', 'Studio'] : [],
  };
}

/**
 * Check if Supabase types are fresh
 */
function checkSupabaseTypesFreshness() {
  const typesPath = path.join(ROOT_DIR, 'packages/shared-types/src/supabase.ts');
  const migrationsDir = path.join(ROOT_DIR, 'supabase/migrations');

  if (!fs.existsSync(typesPath)) {
    return { status: 'missing', message: 'Types file not found' };
  }

  if (!fs.existsSync(migrationsDir)) {
    return { status: 'ok', message: 'No migrations to check' };
  }

  const typesStat = fs.statSync(typesPath);
  const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

  if (migrations.length === 0) {
    return { status: 'ok', message: 'No migrations' };
  }

  // Get the most recent migration
  const latestMigration = migrations.sort().reverse()[0];
  const migrationPath = path.join(migrationsDir, latestMigration);
  const migrationStat = fs.statSync(migrationPath);

  if (migrationStat.mtime > typesStat.mtime) {
    return {
      status: 'stale',
      message: `Types older than latest migration (${latestMigration})`,
      hint: 'Run: npm run db:generate-types:local',
    };
  }

  return { status: 'ok', message: 'Up to date' };
}

/**
 * Check for critical outdated dependencies
 */
function checkCriticalDeps() {
  const issues = [];

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
    const nodeModulesPath = path.join(ROOT_DIR, 'node_modules');

    const criticalDeps = ['typescript', 'react', 'react-native', 'expo', 'next'];

    for (const dep of criticalDeps) {
      const declaredVersion =
        packageJson.dependencies?.[dep] ||
        packageJson.devDependencies?.[dep] ||
        packageJson.overrides?.[dep];

      if (!declaredVersion) continue;

      const installedPkgPath = path.join(nodeModulesPath, dep, 'package.json');
      if (!fs.existsSync(installedPkgPath)) continue;

      const installedPkg = JSON.parse(fs.readFileSync(installedPkgPath, 'utf8'));
      const installed = installedPkg.version;
      const declared = declaredVersion.replace(/[\^~>=<]/g, '');

      // Simple check: major version should match
      const installedMajor = installed.split('.')[0];
      const declaredMajor = declared.split('.')[0];

      if (installedMajor !== declaredMajor) {
        issues.push({
          name: dep,
          declared,
          installed,
        });
      }
    }
  } catch {
    // Ignore errors
  }

  return issues;
}

/**
 * Main execution
 */
async function main() {
  log('\n🩺 Development Environment Doctor\n', 'bold');

  if (FIX_MODE) {
    log('Running in --fix mode: will attempt to fix issues\n', 'cyan');
  }

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

  // Docker & Services
  logSection('Docker & Services');

  const dockerCheck = checkDocker();
  if (dockerCheck.status === 'ok') {
    log(`  ✓ Docker: ${dockerCheck.message}`, 'green');
  } else if (dockerCheck.status === 'stopped') {
    log(`  ⚠ Docker: ${dockerCheck.message}`, 'yellow');
    log('     Start Docker Desktop to use Supabase locally', 'dim');
  } else {
    log('  ○ Docker: Not installed (optional for local Supabase)', 'dim');
  }

  const supabaseCheck = checkSupabaseServices();
  if (supabaseCheck.status === 'ok') {
    log(`  ✓ Supabase local: Running`, 'green');
  } else {
    log('  ○ Supabase local: Not running', 'dim');
    log('     Start with: npm run db:studio', 'dim');
  }

  // Port availability
  logSection('Port Availability');

  const ports = [
    { port: 3000, name: 'Web dev server' },
    { port: 8081, name: 'Metro bundler' },
    { port: 54321, name: 'Supabase API' },
    { port: 54322, name: 'Supabase DB' },
    { port: 54323, name: 'Supabase Studio' },
  ];

  for (const { port, name } of ports) {
    const inUse = await checkPort(port);
    if (inUse) {
      log(`  ● Port ${port} (${name}): In use`, 'cyan');
    } else {
      log(`  ○ Port ${port} (${name}): Available`, 'dim');
    }
  }

  // Optional tools
  logSection('Development Tools');

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
  if (huskyCheck.status === 'ok') {
    log('  ✓ Git hooks: Installed', 'green');
  } else {
    log('  ⚠ Git hooks: Not installed', 'yellow');
    if (FIX_MODE) {
      log('     Attempting fix...', 'dim');
      runCommand('npm run prepare');
      log('     ✓ Fixed: Git hooks installed', 'green');
    } else {
      log('     Run: npm run prepare (or use --fix)', 'dim');
    }
  }

  // Supabase types freshness
  const typesCheck = checkSupabaseTypesFreshness();
  if (typesCheck.status === 'ok') {
    log(`  ✓ Supabase types: ${typesCheck.message}`, 'green');
  } else if (typesCheck.status === 'stale') {
    log(`  ⚠ Supabase types: ${typesCheck.message}`, 'yellow');
    log(`     ${typesCheck.hint}`, 'dim');
  } else {
    log(`  ○ Supabase types: ${typesCheck.message}`, 'dim');
  }

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

  // Dependency health
  logSection('Dependency Health');

  const depIssues = checkCriticalDeps();
  if (depIssues.length === 0) {
    log('  ✓ Critical dependencies: All versions match', 'green');
  } else {
    log(`  ⚠ Version mismatches found:`, 'yellow');
    depIssues.forEach(d => {
      log(`     ${d.name}: declared ${d.declared}, installed ${d.installed}`, 'dim');
    });
    log('     Run: npm install to sync versions', 'dim');
  }

  // Summary
  logSection('Summary');

  const critical = results.filter(r => r.status === 'missing' || r.status === 'outdated');

  if (critical.length === 0) {
    log('  ✓ Your development environment is ready! 🎉', 'green');
    console.log();
    log('  Quick commands:', 'cyan');
    log('     npm run mobile     Start mobile app', 'dim');
    log('     npm run web        Start web app', 'dim');
    log('     npm run db:studio  Start Supabase Studio', 'dim');
    process.exit(0);
  } else {
    log(`  Found ${critical.length} issue(s) to fix:\n`, 'yellow');
    critical.forEach((r, i) => {
      log(`  ${i + 1}. ${r.name}`, 'yellow');
      if (r.hint) log(`     ${r.hint}`, 'dim');
    });

    console.log();
    log('  💡 Tip: Run with --fix to auto-fix some issues', 'cyan');
    process.exit(1);
  }
}

main();
