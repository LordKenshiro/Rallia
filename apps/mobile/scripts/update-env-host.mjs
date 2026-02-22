#!/usr/bin/env node
/**
 * Updates host addresses in .env.local with the current machine IP from en0.
 * Run before `expo run` so the app uses the correct local URLs.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_LOCAL_PATH = path.join(__dirname, '..', '.env.local');

// Variables that contain a host we want to update (protocol + IP + optional port)
const HOST_VAR_PREFIXES = [
  'EXPO_PUBLIC_SUPABASE_URL=',
  'EXPO_PUBLIC_API_URL=',
];

function getLocalIP() {
  try {
    return execSync('ipconfig getifaddr en0', { encoding: 'utf-8' }).trim();
  } catch {
    console.warn('Could not get IP from en0, leaving .env.local unchanged.');
    process.exit(0);
  }
}

function updateEnvLocal(newHost) {
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    console.warn('.env.local not found, skipping host update.');
    return;
  }

  let content = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');
  let updated = false;

  for (const prefix of HOST_VAR_PREFIXES) {
    // Match line like EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.72:54321
    const regex = new RegExp(
      `^(${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})http://[0-9.]+`,
      'm'
    );
    if (regex.test(content)) {
      content = content.replace(regex, `$1http://${newHost}`);
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(ENV_LOCAL_PATH, content, 'utf-8');
    console.log(`Updated .env.local host to ${newHost}`);
  }
}

const ip = getLocalIP();
if (ip) {
  updateEnvLocal(ip);
}
