#!/usr/bin/env node

/**
 * AI Context Generator
 *
 * Generates a fresh context summary for AI assistants (Claude, ChatGPT, Cursor).
 * Outputs project overview, recent changes, and current focus areas.
 *
 * Usage: node scripts/dev/generate-ai-context.js [--output=file.md] [--clipboard]
 *
 * Options:
 *   --output=FILE   Write to file instead of stdout
 *   --clipboard     Copy to clipboard (macOS only)
 *   --compact       Shorter output for context-limited models
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const OUTPUT_FILE = process.argv.find(a => a.startsWith('--output='))?.split('=')[1];
const TO_CLIPBOARD = process.argv.includes('--clipboard');
const COMPACT = process.argv.includes('--compact');

/**
 * Run a command and return output
 */
function runCommand(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      cwd: ROOT_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Get package.json info
 */
function getPackageInfo() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  return {
    name: pkg.name,
    version: pkg.version,
    workspaces: pkg.workspaces,
    scripts: Object.keys(pkg.scripts || {}).filter(s => !s.startsWith('//')),
  };
}

/**
 * Get monorepo structure
 */
function getMonorepoStructure() {
  const apps = [];
  const packages = [];

  const appsDir = path.join(ROOT_DIR, 'apps');
  if (fs.existsSync(appsDir)) {
    for (const app of fs.readdirSync(appsDir)) {
      const pkgPath = path.join(appsDir, app, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        apps.push({ name: app, packageName: pkg.name });
      }
    }
  }

  const packagesDir = path.join(ROOT_DIR, 'packages');
  if (fs.existsSync(packagesDir)) {
    for (const pkg of fs.readdirSync(packagesDir)) {
      const pkgPath = path.join(packagesDir, pkg, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        packages.push({ name: pkg, packageName: pkgJson.name });
      }
    }
  }

  return { apps, packages };
}

/**
 * Get recent git activity
 */
function getRecentActivity() {
  // Recent commits
  const commits = runCommand('git log --oneline -10 --no-decorate 2>/dev/null');

  // Recently modified directories
  const modifiedFiles = runCommand('git diff --name-only HEAD~10 HEAD 2>/dev/null') || '';
  const modifiedDirs = new Set();

  for (const file of modifiedFiles.split('\n').filter(Boolean)) {
    const parts = file.split('/');
    if (parts.length >= 2) {
      if (parts[0] === 'apps' || parts[0] === 'packages') {
        modifiedDirs.add(`${parts[0]}/${parts[1]}`);
      } else if (parts[0] === 'supabase' && parts[1] === 'migrations') {
        modifiedDirs.add('supabase/migrations');
      } else if (parts[0] === 'supabase' && parts[1] === 'functions') {
        modifiedDirs.add(`supabase/functions/${parts[2]}`);
      }
    }
  }

  // Current branch
  const branch = runCommand('git branch --show-current 2>/dev/null');

  // Uncommitted changes
  const status = runCommand('git status --porcelain 2>/dev/null');
  const hasUncommitted = status && status.length > 0;

  return {
    commits: commits ? commits.split('\n') : [],
    modifiedAreas: Array.from(modifiedDirs),
    branch,
    hasUncommitted,
  };
}

/**
 * Get codebase statistics
 */
function getCodebaseStats() {
  const stats = {
    totalFiles: 0,
    byExtension: {},
    migrations: 0,
    edgeFunctions: 0,
    translations: 0,
  };

  // Count TypeScript/JavaScript files
  const tsFiles = runCommand(
    'find apps packages -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l'
  );
  stats.byExtension['.ts/.tsx'] = parseInt(tsFiles?.trim() || '0', 10);

  // Count migrations
  const migrationsDir = path.join(ROOT_DIR, 'supabase/migrations');
  if (fs.existsSync(migrationsDir)) {
    stats.migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).length;
  }

  // Count edge functions
  const functionsDir = path.join(ROOT_DIR, 'supabase/functions');
  if (fs.existsSync(functionsDir)) {
    stats.edgeFunctions = fs.readdirSync(functionsDir).filter(f => {
      return fs.statSync(path.join(functionsDir, f)).isDirectory();
    }).length;
  }

  // Count translation keys
  const translationsPath = path.join(
    ROOT_DIR,
    'packages/shared-translations/src/locales/en-US.json'
  );
  if (fs.existsSync(translationsPath)) {
    const content = fs.readFileSync(translationsPath, 'utf8');
    stats.translations = (content.match(/:/g) || []).length;
  }

  return stats;
}

/**
 * Get available npm scripts with descriptions
 */
function getScriptsWithDescriptions() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  const scripts = [];

  for (const [name, command] of Object.entries(pkg.scripts || {})) {
    if (name.startsWith('//')) continue;

    const descKey = `// ${name}`;
    const description = pkg.scripts[descKey] || '';

    if (description) {
      scripts.push({ name, description });
    }
  }

  return scripts;
}

/**
 * Get current roadmap/focus from roadmap files
 */
function getCurrentFocus() {
  const focus = [];

  const roadmapDir = path.join(ROOT_DIR, 'roadmap');
  if (!fs.existsSync(roadmapDir)) return focus;

  // Check phase files
  for (const file of fs.readdirSync(roadmapDir)) {
    if (file.startsWith('phase_')) {
      const phasePath = path.join(roadmapDir, file, 'TASKS.md');
      if (fs.existsSync(phasePath)) {
        const content = fs.readFileSync(phasePath, 'utf8');

        // Find unchecked items (- [ ])
        const unchecked = content.match(/- \[ \] .+/g) || [];
        const checked = content.match(/- \[x\] .+/gi) || [];

        if (unchecked.length > 0) {
          focus.push({
            phase: file,
            pending: unchecked.length,
            completed: checked.length,
            nextTasks: unchecked.slice(0, 3).map(t => t.replace('- [ ] ', '')),
          });
        }
      }
    }
  }

  return focus;
}

/**
 * Generate the context document
 */
function generateContext() {
  const pkg = getPackageInfo();
  const structure = getMonorepoStructure();
  const activity = getRecentActivity();
  const stats = getCodebaseStats();
  const scripts = getScriptsWithDescriptions();
  const focus = getCurrentFocus();

  const now = new Date().toISOString().split('T')[0];

  let output = '';

  // Header
  output += `# ${pkg.name} - AI Context\n\n`;
  output += `> Generated: ${now} | Branch: ${activity.branch || 'unknown'}`;
  if (activity.hasUncommitted) output += ' | ⚠️ Uncommitted changes';
  output += '\n\n';

  // Project Overview
  output += `## Project Overview\n\n`;
  output += `**Rallia** is a mobile-first platform for organizing sports matches (padel, tennis, etc.).\n\n`;
  output += `- **Tech Stack**: React Native (Expo), Next.js, Supabase, TypeScript\n`;
  output += `- **Architecture**: Monorepo with shared packages\n`;
  output += `- **Database**: PostgreSQL via Supabase with ${stats.migrations} migrations\n`;
  output += `- **Edge Functions**: ${stats.edgeFunctions} Deno functions\n`;
  output += `- **i18n**: ${stats.translations}+ translation keys (en-US, fr-CA)\n\n`;

  // Structure
  output += `## Monorepo Structure\n\n`;
  output += `### Apps\n`;
  for (const app of structure.apps) {
    output += `- \`apps/${app.name}\` (${app.packageName})\n`;
  }
  output += `\n### Shared Packages\n`;
  for (const pkg of structure.packages) {
    output += `- \`packages/${pkg.name}\` (${pkg.packageName})\n`;
  }
  output += '\n';

  // Recent Activity
  if (!COMPACT) {
    output += `## Recent Activity\n\n`;

    if (activity.modifiedAreas.length > 0) {
      output += `**Recently Modified Areas:**\n`;
      for (const area of activity.modifiedAreas.slice(0, 8)) {
        output += `- ${area}\n`;
      }
      output += '\n';
    }

    if (activity.commits.length > 0) {
      output += `**Recent Commits:**\n`;
      output += '```\n';
      for (const commit of activity.commits.slice(0, 5)) {
        output += `${commit}\n`;
      }
      output += '```\n\n';
    }
  }

  // Current Focus
  if (focus.length > 0 && !COMPACT) {
    output += `## Current Focus\n\n`;
    for (const phase of focus) {
      output += `### ${phase.phase.replace('_', ' ').toUpperCase()}\n`;
      output += `Progress: ${phase.completed}/${phase.completed + phase.pending} tasks\n\n`;
      output += `Next tasks:\n`;
      for (const task of phase.nextTasks) {
        output += `- ${task}\n`;
      }
      output += '\n';
    }
  }

  // Key Commands
  output += `## Key Commands\n\n`;
  output += '```bash\n';
  output += 'npm run mobile          # Start Expo dev server\n';
  output += 'npm run web             # Start Next.js dev server\n';
  output += 'npm run db:studio       # Start Supabase Studio\n';
  output += 'npm run db:reset        # Reset local database\n';
  output += 'npm run type-check      # TypeScript checking\n';
  output += 'npm run validate        # Full CI validation\n';
  output += '```\n\n';

  // Key Patterns
  output += `## Key Patterns\n\n`;
  output += `- **Data Flow**: Component → Hook → TanStack Query → Service → Supabase\n`;
  output += `- **State**: React Context for auth/theme, TanStack Query for server data\n`;
  output += `- **Styling**: Design tokens from \`@rallia/design-system\`, NativeWind/Tailwind\n`;
  output += `- **i18n**: i18next (mobile) / next-intl (web), shared translations\n`;
  output += `- **Logging**: Use \`Logger\` from \`@rallia/shared-services\`, not console.log\n\n`;

  // Important Files
  output += `## Important Files\n\n`;
  output += `- \`.cursor/rules/project-guidelines/RULE.md\` - Full coding guidelines\n`;
  output += `- \`packages/shared-types/src/supabase.ts\` - Generated DB types (don't edit)\n`;
  output += `- \`packages/shared-translations/src/locales/\` - i18n strings\n`;
  output += `- \`supabase/migrations/\` - Database schema\n`;
  output += `- \`specs/\` - Product specifications\n`;

  return output;
}

/**
 * Main execution
 */
function main() {
  const context = generateContext();

  if (OUTPUT_FILE) {
    const outputPath = path.isAbsolute(OUTPUT_FILE)
      ? OUTPUT_FILE
      : path.join(ROOT_DIR, OUTPUT_FILE);
    fs.writeFileSync(outputPath, context);
    console.log(`✓ Context written to ${OUTPUT_FILE}`);
  } else if (TO_CLIPBOARD) {
    try {
      execSync('pbcopy', { input: context });
      console.log('✓ Context copied to clipboard');
    } catch {
      console.error('Error: Clipboard copy failed (pbcopy not available)');
      process.exit(1);
    }
  } else {
    console.log(context);
  }
}

main();
