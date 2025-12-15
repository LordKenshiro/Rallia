#!/usr/bin/env node

/**
 * Theme Usage Audit Script
 * Scans the mobile app for theme-related issues:
 * - Hardcoded hex colors
 * - COLORS constant imports
 * - Missing useThemeStyles() usage
 */

const fs = require('fs');
const path = require('path');

const MOBILE_SRC = path.join(__dirname, '../apps/mobile/src');
const SHARED_COMPONENTS = path.join(__dirname, '../packages/shared-components/src');

const issues = {
  hardcodedColors: [],
  colorsImports: [],
  missingThemeHook: [],
};

// Common hex color patterns
const HEX_COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const COLORS_IMPORT_PATTERN =
  /from ['"].*\/constants\/colors['"]|from ['"]@rallia\/shared-constants.*colors['"]|from ['"].*\/theme\/index['"]/;
const USE_THEME_STYLES_PATTERN = /useThemeStyles\(\)/;

function scanFile(filePath, relativePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Check for hardcoded hex colors (excluding design system tokens)
  const hexMatches = content.match(HEX_COLOR_PATTERN);
  if (hexMatches) {
    // Filter out common false positives
    const realColors = hexMatches.filter(color => {
      // Skip if it's in a comment or string that's clearly not a color
      return (
        !color.match(/^#[0-9a-fA-F]{6}$/i) ||
        (!content.includes(`// ${color}`) && !content.includes(`/* ${color} */`))
      );
    });

    if (realColors.length > 0) {
      issues.hardcodedColors.push({
        file: relativePath,
        colors: [...new Set(realColors)],
      });
    }
  }

  // Check for COLORS imports
  if (COLORS_IMPORT_PATTERN.test(content)) {
    const importLine = lines.findIndex(line => COLORS_IMPORT_PATTERN.test(line));
    issues.colorsImports.push({
      file: relativePath,
      line: importLine + 1,
    });
  }

  // Check if component file but missing useThemeStyles
  if (filePath.endsWith('.tsx') && !filePath.includes('.test.') && !filePath.includes('.spec.')) {
    const hasStyleSheet =
      content.includes('StyleSheet.create') ||
      content.includes('backgroundColor') ||
      content.includes('color:');
    const hasThemeHook = USE_THEME_STYLES_PATTERN.test(content);

    if (hasStyleSheet && !hasThemeHook && !content.includes('// Theme hook not needed')) {
      // Check if it's a component (has export default or export function/const)
      const isComponent =
        /export\s+(default\s+)?(function|const|class)\s+\w+/.test(content) ||
        /export\s+default\s+/.test(content);

      if (isComponent) {
        issues.missingThemeHook.push({
          file: relativePath,
        });
      }
    }
  }
}

function scanDirectory(dir, baseDir = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(baseDir, entry.name);

    // Skip node_modules, .git, etc.
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
        scanDirectory(fullPath, relativePath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      scanFile(fullPath, relativePath);
    }
  }
}

console.log('🔍 Scanning for theme usage issues...\n');

// Scan mobile app
console.log('Scanning mobile app...');
scanDirectory(MOBILE_SRC, 'apps/mobile/src');

// Scan shared components
console.log('Scanning shared components...');
scanDirectory(SHARED_COMPONENTS, 'packages/shared-components/src');

// Report results
console.log('\n📊 Audit Results:\n');

if (issues.hardcodedColors.length > 0) {
  console.log(`❌ Found ${issues.hardcodedColors.length} files with hardcoded hex colors:`);
  issues.hardcodedColors.forEach(({ file, colors }) => {
    console.log(`   ${file}`);
    console.log(`     Colors: ${colors.join(', ')}`);
  });
  console.log('');
}

if (issues.colorsImports.length > 0) {
  console.log(`❌ Found ${issues.colorsImports.length} files importing COLORS constants:`);
  issues.colorsImports.forEach(({ file, line }) => {
    console.log(`   ${file}:${line}`);
  });
  console.log('');
}

if (issues.missingThemeHook.length > 0) {
  console.log(
    `⚠️  Found ${issues.missingThemeHook.length} component files that may need useThemeStyles():`
  );
  issues.missingThemeHook.forEach(({ file }) => {
    console.log(`   ${file}`);
  });
  console.log('');
}

const totalIssues =
  issues.hardcodedColors.length + issues.colorsImports.length + issues.missingThemeHook.length;

if (totalIssues === 0) {
  console.log('✅ No issues found! All components are using theme-aware colors.');
} else {
  console.log(`\n📝 Total issues found: ${totalIssues}`);
  console.log(
    '\n💡 Recommendation: Use useThemeStyles() hook or direct imports from @rallia/design-system'
  );
  process.exit(1);
}
