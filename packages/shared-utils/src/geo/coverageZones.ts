/**
 * Coverage zone utilities for geographic restriction (e.g. pre-onboarding).
 * Validates postal codes against Greater Montreal Area (GMA) using FSA allowlist.
 */

// Canadian postal code format: A1A 1A1 (letter-digit-letter digit-letter-digit)
// First letter: A-Z except D, F, I, O, Q, U, W, Z
// See: https://en.wikipedia.org/wiki/Postal_codes_in_Canada
const CA_POSTAL_REGEX = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

// Valid 3rd character for Canadian FSA (letter in 2nd segment): A,B,C,E,G,H,J-N,P,R,S,T,V-W,X,Y,Z
const FSA_THIRD_CHAR = 'ABCEGHJKLMNPRSTVWXYZ';

/**
 * Greater Montreal Area (GMA) FSA allowlist.
 * FSA = Forward Sortation Area (first 3 characters of Canadian postal code).
 * - H1–H9: Montreal metro (island, Laval, South Shore)
 * - J3, J4, J7: South Shore and North Shore (e.g. Longueuil, Brossard, Terrebonne)
 */
function buildGmaFsaSet(): Set<string> {
  const set = new Set<string>();

  // H1A through H9Z (Montreal metro)
  for (let d = 1; d <= 9; d++) {
    for (const c of FSA_THIRD_CHAR) {
      set.add(`H${d}${c}`);
    }
  }

  // J3, J4, J7 (South Shore, North Shore)
  for (const d of [3, 4, 7]) {
    for (const c of FSA_THIRD_CHAR) {
      set.add(`J${d}${c}`);
    }
  }

  return set;
}

const GMA_FSA_SET = buildGmaFsaSet();

/**
 * Validates Canadian postal code format (A1A 1A1) using regex.
 * Does not validate that the postal code exists, only format.
 */
export function isValidCanadianPostalCode(postalCode: string): boolean {
  const trimmed = postalCode.trim();
  return CA_POSTAL_REGEX.test(trimmed);
}

/**
 * Normalize Canadian postal code to 6 characters (no space) for FSA extraction.
 */
function normalizeCanadianForFsa(postalCode: string): string {
  return postalCode.replace(/[\s-]/g, '').toUpperCase().slice(0, 6);
}

/**
 * Returns whether the given postal code is in the Greater Montreal Area (GMA).
 * Use after validating format: for US or invalid format, returns false.
 *
 * @param postalCode - Raw or normalized Canadian postal code (e.g. "H2X 1Y4" or "H2X1Y4")
 * @param country - 'CA' or 'US'. US codes are not in GMA.
 */
export function isPostalCodeInGreaterMontreal(postalCode: string, country: 'CA' | 'US'): boolean {
  if (country === 'US') {
    return false;
  }
  const normalized = normalizeCanadianForFsa(postalCode);
  if (normalized.length < 3) {
    return false;
  }
  const fsa = normalized.slice(0, 3);
  return GMA_FSA_SET.has(fsa);
}
