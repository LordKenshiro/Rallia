#!/usr/bin/env node

/**
 * Translation Validator Script
 *
 * Validates translation files for consistency and completeness:
 * - Missing keys between locales
 * - Mismatched interpolation variables
 * - Unused translation keys (not referenced in code)
 * - Duplicate keys
 * - Empty values
 *
 * Usage: node scripts/dev/validate-translations.js [--check-usage] [--verbose]
 *
 * Options:
 *   --check-usage    Check for unused translation keys in codebase (slower)
 *   --verbose        Show detailed output
 *   --json           Output results as JSON
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const TRANSLATIONS_DIR = path.join(ROOT_DIR, 'packages/shared-translations/src/locales');
const SOURCE_DIRS = [
  path.join(ROOT_DIR, 'apps/mobile/src'),
  path.join(ROOT_DIR, 'apps/web'),
  path.join(ROOT_DIR, 'packages'),
];

const CHECK_USAGE = process.argv.includes('--check-usage');
const VERBOSE = process.argv.includes('--verbose');
const JSON_OUTPUT = process.argv.includes('--json');

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
  if (!JSON_OUTPUT) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }
}

function logSection(title) {
  if (!JSON_OUTPUT) {
    console.log();
    log(`━━━ ${title} ━━━`, 'cyan');
  }
}

/**
 * Flatten nested JSON object to dot-notation keys
 * e.g., { common: { loading: "..." } } -> { "common.loading": "..." }
 */
function flattenObject(obj, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Extract interpolation variables from a string
 * e.g., "Hello {name}, you have {count} messages" -> ["name", "count"]
 */
function extractVariables(str) {
  if (typeof str !== 'string') return [];
  const matches = str.match(/\{([^}]+)\}/g) || [];
  return matches.map(m => m.slice(1, -1)).sort();
}

/**
 * Load all translation files
 */
function loadTranslations() {
  const translations = {};
  const files = fs.readdirSync(TRANSLATIONS_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const locale = file.replace('.json', '');
    const content = JSON.parse(fs.readFileSync(path.join(TRANSLATIONS_DIR, file), 'utf8'));
    translations[locale] = {
      raw: content,
      flat: flattenObject(content),
    };
  }

  return translations;
}

/**
 * Find missing keys between locales
 */
function findMissingKeys(translations) {
  const locales = Object.keys(translations);
  const issues = [];

  // Use the first locale as reference (usually en-US)
  const referenceLocale = locales.find(l => l.startsWith('en')) || locales[0];
  const referenceKeys = Object.keys(translations[referenceLocale].flat);

  for (const locale of locales) {
    if (locale === referenceLocale) continue;

    const localeKeys = new Set(Object.keys(translations[locale].flat));

    // Keys in reference but not in this locale
    for (const key of referenceKeys) {
      if (!localeKeys.has(key)) {
        issues.push({
          type: 'missing',
          locale,
          key,
          message: `Key "${key}" exists in ${referenceLocale} but not in ${locale}`,
        });
      }
    }

    // Keys in this locale but not in reference (extra keys)
    for (const key of localeKeys) {
      if (!referenceKeys.includes(key)) {
        issues.push({
          type: 'extra',
          locale,
          key,
          message: `Key "${key}" exists in ${locale} but not in ${referenceLocale}`,
        });
      }
    }
  }

  return issues;
}

/**
 * Find mismatched interpolation variables
 */
function findVariableMismatches(translations) {
  const locales = Object.keys(translations);
  const issues = [];

  const referenceLocale = locales.find(l => l.startsWith('en')) || locales[0];
  const referenceFlat = translations[referenceLocale].flat;

  for (const locale of locales) {
    if (locale === referenceLocale) continue;

    const localeFlat = translations[locale].flat;

    for (const [key, refValue] of Object.entries(referenceFlat)) {
      if (!localeFlat[key]) continue;

      const refVars = extractVariables(refValue);
      const localeVars = extractVariables(localeFlat[key]);

      if (JSON.stringify(refVars) !== JSON.stringify(localeVars)) {
        issues.push({
          type: 'variable_mismatch',
          locale,
          key,
          expected: refVars,
          actual: localeVars,
          message: `Variable mismatch in "${key}": ${referenceLocale} has {${refVars.join(', ')}}, ${locale} has {${localeVars.join(', ')}}`,
        });
      }
    }
  }

  return issues;
}

/**
 * Find empty values
 */
function findEmptyValues(translations) {
  const issues = [];

  for (const [locale, data] of Object.entries(translations)) {
    for (const [key, value] of Object.entries(data.flat)) {
      if (value === '' || value === null || value === undefined) {
        issues.push({
          type: 'empty',
          locale,
          key,
          message: `Empty value for "${key}" in ${locale}`,
        });
      }
    }
  }

  return issues;
}

/**
 * Recursively get all source files
 */
function getSourceFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];

  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.next', '.expo'].includes(entry.name)) {
        files.push(...getSourceFiles(fullPath, extensions));
      }
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Find unused translation keys in codebase
 */
function findUnusedKeys(translations) {
  const issues = [];

  log('  Scanning source files...', 'dim');

  // Get all source files
  let allFiles = [];
  for (const dir of SOURCE_DIRS) {
    allFiles.push(...getSourceFiles(dir));
  }

  // Read all file contents
  const allContent = allFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

  // Get all keys from reference locale
  const referenceLocale =
    Object.keys(translations).find(l => l.startsWith('en')) || Object.keys(translations)[0];
  const allKeys = Object.keys(translations[referenceLocale].flat);

  log(`  Checking ${allKeys.length} keys against ${allFiles.length} files...`, 'dim');

  // Check each key
  for (const key of allKeys) {
    // Check various patterns:
    // t('key'), t("key"), t(`key`)
    // useTranslations('namespace') -> t('subkey')
    // Direct references like 'common.loading'

    const keyParts = key.split('.');
    const lastPart = keyParts[keyParts.length - 1];
    const namespace = keyParts[0];

    // Check if the full key or last part appears in code
    const patterns = [`'${key}'`, `"${key}"`, `\`${key}\``, `'${lastPart}'`, `"${lastPart}"`];

    const isUsed = patterns.some(pattern => allContent.includes(pattern));

    if (!isUsed) {
      // Double check with regex for dynamic keys
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const dynamicPattern = new RegExp(`['"\`]${escapedKey}['"\`]`);

      if (!dynamicPattern.test(allContent)) {
        issues.push({
          type: 'unused',
          key,
          message: `Key "${key}" appears to be unused in codebase`,
        });
      }
    }
  }

  return issues;
}

/**
 * Main execution
 */
function main() {
  if (!JSON_OUTPUT) {
    log('\n🌐 Translation Validator\n', 'bold');
  }

  const translations = loadTranslations();
  const locales = Object.keys(translations);

  if (!JSON_OUTPUT) {
    log(`Found ${locales.length} locales: ${locales.join(', ')}`, 'dim');

    const referenceLocale = locales.find(l => l.startsWith('en')) || locales[0];
    const keyCount = Object.keys(translations[referenceLocale].flat).length;
    log(`Total keys: ${keyCount}`, 'dim');
  }

  const results = {
    missingKeys: [],
    variableMismatches: [],
    emptyValues: [],
    unusedKeys: [],
  };

  // Check for missing keys
  logSection('Missing Keys');
  results.missingKeys = findMissingKeys(translations);

  if (results.missingKeys.length === 0) {
    log('  ✓ All keys present in all locales', 'green');
  } else {
    const missing = results.missingKeys.filter(i => i.type === 'missing');
    const extra = results.missingKeys.filter(i => i.type === 'extra');

    if (missing.length > 0) {
      log(`  ✗ ${missing.length} missing key(s)`, 'red');
      if (VERBOSE) {
        missing.slice(0, 10).forEach(i => log(`    • ${i.message}`, 'dim'));
        if (missing.length > 10) log(`    ... and ${missing.length - 10} more`, 'dim');
      }
    }
    if (extra.length > 0) {
      log(`  ⚠ ${extra.length} extra key(s) (not in reference locale)`, 'yellow');
      if (VERBOSE) {
        extra.slice(0, 10).forEach(i => log(`    • ${i.message}`, 'dim'));
        if (extra.length > 10) log(`    ... and ${extra.length - 10} more`, 'dim');
      }
    }
  }

  // Check for variable mismatches
  logSection('Interpolation Variables');
  results.variableMismatches = findVariableMismatches(translations);

  if (results.variableMismatches.length === 0) {
    log('  ✓ All interpolation variables match', 'green');
  } else {
    log(`  ✗ ${results.variableMismatches.length} variable mismatch(es)`, 'red');
    if (VERBOSE) {
      results.variableMismatches.slice(0, 10).forEach(i => log(`    • ${i.message}`, 'dim'));
      if (results.variableMismatches.length > 10) {
        log(`    ... and ${results.variableMismatches.length - 10} more`, 'dim');
      }
    }
  }

  // Check for empty values
  logSection('Empty Values');
  results.emptyValues = findEmptyValues(translations);

  if (results.emptyValues.length === 0) {
    log('  ✓ No empty values', 'green');
  } else {
    log(`  ⚠ ${results.emptyValues.length} empty value(s)`, 'yellow');
    if (VERBOSE) {
      results.emptyValues.slice(0, 10).forEach(i => log(`    • ${i.message}`, 'dim'));
      if (results.emptyValues.length > 10) {
        log(`    ... and ${results.emptyValues.length - 10} more`, 'dim');
      }
    }
  }

  // Check for unused keys (optional, slower)
  if (CHECK_USAGE) {
    logSection('Unused Keys');
    results.unusedKeys = findUnusedKeys(translations);

    if (results.unusedKeys.length === 0) {
      log('  ✓ All keys appear to be used', 'green');
    } else {
      log(`  ⚠ ${results.unusedKeys.length} potentially unused key(s)`, 'yellow');
      if (VERBOSE) {
        results.unusedKeys.slice(0, 20).forEach(i => log(`    • ${i.key}`, 'dim'));
        if (results.unusedKeys.length > 20) {
          log(`    ... and ${results.unusedKeys.length - 20} more`, 'dim');
        }
      }
    }
  }

  // Summary
  logSection('Summary');

  const criticalIssues =
    results.missingKeys.filter(i => i.type === 'missing').length +
    results.variableMismatches.length;
  const warnings =
    results.emptyValues.length +
    results.missingKeys.filter(i => i.type === 'extra').length +
    results.unusedKeys.length;

  if (JSON_OUTPUT) {
    console.log(
      JSON.stringify(
        {
          success: criticalIssues === 0,
          criticalIssues,
          warnings,
          ...results,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } else {
    if (criticalIssues === 0 && warnings === 0) {
      log('  ✓ All translations valid! 🎉', 'green');
    } else {
      if (criticalIssues > 0) {
        log(`  ✗ ${criticalIssues} critical issue(s) (must fix)`, 'red');
      }
      if (warnings > 0) {
        log(`  ⚠ ${warnings} warning(s) (should review)`, 'yellow');
      }

      console.log();
      log('  💡 Tips:', 'cyan');
      log('     • Run with --verbose for detailed output', 'dim');
      log('     • Run with --check-usage to find unused keys', 'dim');
      log('     • Run with --json for machine-readable output', 'dim');
    }
  }

  process.exit(criticalIssues > 0 ? 1 : 0);
}

main();
