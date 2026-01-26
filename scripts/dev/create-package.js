#!/usr/bin/env node

/**
 * Package Scaffolding Script
 *
 * Creates a new package in the monorepo with the correct structure.
 *
 * Usage: node scripts/create-package.js <package-name> [--type=lib|hook|util]
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

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

/**
 * Prompt user for input
 */
async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(`${colors.cyan}${question}${colors.reset} `, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Create package.json for new package
 */
function createPackageJson(name, description) {
  return JSON.stringify(
    {
      name: `@rallia/${name}`,
      version: '1.0.0',
      private: true,
      main: 'src/index.ts',
      types: 'src/index.ts',
      scripts: {
        'type-check': 'tsc --noEmit',
        test: 'jest',
        clean: 'rm -rf node_modules dist',
      },
      dependencies: {},
      devDependencies: {
        typescript: '^5.9.2',
      },
      peerDependencies: {},
    },
    null,
    2
  );
}

/**
 * Create tsconfig.json for new package
 */
function createTsConfig() {
  return JSON.stringify(
    {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', '**/*.test.ts'],
    },
    null,
    2
  );
}

/**
 * Create index.ts
 */
function createIndex(name) {
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return `/**
 * @rallia/${name}
 *
 * TODO: Add package description
 */

export const ${pascalName} = {
  // TODO: Add exports
};

// Re-export types
export * from './types';
`;
}

/**
 * Create types.ts
 */
function createTypes(name) {
  return `/**
 * Types for @rallia/${name}
 */

// TODO: Add types
export interface ${name
    .split('-')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')}Config {
  // Add configuration options
}
`;
}

/**
 * Create README.md
 */
function createReadme(name, description) {
  return `# @rallia/${name}

${description || 'TODO: Add package description'}

## Installation

This package is part of the Rallia monorepo and is automatically available to other workspace packages.

\`\`\`json
{
  "dependencies": {
    "@rallia/${name}": "*"
  }
}
\`\`\`

## Usage

\`\`\`typescript
import { } from '@rallia/${name}';

// TODO: Add usage examples
\`\`\`

## API

TODO: Document the API

## Development

\`\`\`bash
# Run type checking
npm run type-check --workspace=@rallia/${name}

# Run tests
npm run test --workspace=@rallia/${name}
\`\`\`
`;
}

/**
 * Create jest.config.js
 */
function createJestConfig() {
  return `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
};
`;
}

/**
 * Create a sample test file
 */
function createSampleTest(name) {
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return `import { ${pascalName} } from './index';

describe('${pascalName}', () => {
  it('should be defined', () => {
    expect(${pascalName}).toBeDefined();
  });
});
`;
}

/**
 * Main execution
 */
async function main() {
  log('\n📦 Create New Package\n', 'bold');

  // Get package name from args or prompt
  let packageName = process.argv[2];

  if (!packageName || packageName.startsWith('--')) {
    packageName = await prompt('Package name (e.g., shared-analytics):');
  }

  if (!packageName) {
    log('Error: Package name is required', 'red');
    process.exit(1);
  }

  // Validate package name
  if (!/^[a-z][a-z0-9-]*$/.test(packageName)) {
    log(
      'Error: Package name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens',
      'red'
    );
    process.exit(1);
  }

  // Check if package already exists
  const packageDir = path.join(PACKAGES_DIR, packageName);
  if (fs.existsSync(packageDir)) {
    log(`Error: Package "${packageName}" already exists`, 'red');
    process.exit(1);
  }

  // Get description
  const description = await prompt('Package description (optional):');

  log('\n  Creating package structure...', 'dim');

  // Create directories
  fs.mkdirSync(packageDir, { recursive: true });
  fs.mkdirSync(path.join(packageDir, 'src'), { recursive: true });

  // Create files
  const files = [
    ['package.json', createPackageJson(packageName, description)],
    ['tsconfig.json', createTsConfig()],
    ['jest.config.js', createJestConfig()],
    ['README.md', createReadme(packageName, description)],
    ['src/index.ts', createIndex(packageName)],
    ['src/types.ts', createTypes(packageName)],
    ['src/index.test.ts', createSampleTest(packageName)],
  ];

  files.forEach(([filename, content]) => {
    const filePath = path.join(packageDir, filename);
    fs.writeFileSync(filePath, content);
    log(`  ✓ Created ${filename}`, 'green');
  });

  log('\n✨ Package created successfully!\n', 'bold');

  log('Next steps:', 'cyan');
  log(`  1. Run: npm install`, 'dim');
  log(`  2. Edit: packages/${packageName}/src/index.ts`, 'dim');
  log(`  3. Import in other packages:`, 'dim');
  log(`     import { } from '@rallia/${packageName}';`, 'dim');

  console.log();
}

main().catch(err => {
  log(`Error: ${err.message}`, 'red');
  process.exit(1);
});
