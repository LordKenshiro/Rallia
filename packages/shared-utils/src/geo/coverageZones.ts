/**
 * Coverage zone utilities for geographic restriction (e.g. pre-onboarding).
 * Validates postal codes against Greater Montreal Area (GMA) using FSA allowlist.
 */

// Canadian postal code format: A1A 1A1 (letter-digit-letter digit-letter-digit)
// First letter: A-Z except D, F, I, O, Q, U, W, Z
// See: https://en.wikipedia.org/wiki/Postal_codes_in_Canada
const CA_POSTAL_REGEX = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

// US ZIP code: 12345 or 12345-6789
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

// Valid 3rd character for Canadian FSA (letter in 2nd segment): A,B,C,E,G,H,J-N,P,R,S,T,V-W,X,Y,Z
const FSA_THIRD_CHAR = 'ABCEGHJKLMNPRSTVWXYZ';

/**
 * Greater Montreal Area (GMA) FSA allowlist.
 * FSA = Forward Sortation Area (first 3 characters of Canadian postal code).
 * Covers the Communauté métropolitaine de Montréal (CMM) and surroundings:
 * - H1–H9: Montreal island, Laval, parts of South Shore
 * - J3: Chambly, Carignan, Saint-Jean-sur-Richelieu area
 * - J4: Longueuil, Brossard, Saint-Lambert
 * - J5: Saint-Bruno, Sainte-Julie, Beloeil, Mont-Saint-Hilaire, Varennes
 * - J6: Terrebonne (old town), Lachenaie, Châteauguay, Beauharnois, L'Île-Perrot
 * - J7: Blainville, Terrebonne (Lachenaie), Mirabel, Deux-Montagnes, Vaudreuil-Dorion
 */
function buildGmaFsaSet(): Set<string> {
  const set = new Set<string>();

  // H1A through H9Z (Montreal metro)
  for (let d = 1; d <= 9; d++) {
    for (const c of FSA_THIRD_CHAR) {
      set.add(`H${d}${c}`);
    }
  }

  // J3, J4, J5, J6, J7 (South Shore, North Shore, greater CMM)
  for (const d of [3, 4, 5, 6, 7]) {
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
 * Validates US ZIP code format (12345 or 12345-6789).
 */
export function isValidUSZipCode(postalCode: string): boolean {
  const trimmed = postalCode.trim();
  return US_ZIP_REGEX.test(trimmed);
}

/**
 * Detect the country of a postal code based on format, or null if unrecognized.
 */
export function detectPostalCodeCountry(postalCode: string): 'CA' | 'US' | null {
  const trimmed = postalCode.trim();
  if (CA_POSTAL_REGEX.test(trimmed)) return 'CA';
  if (US_ZIP_REGEX.test(trimmed)) return 'US';
  return null;
}

/**
 * Normalize a postal code to its canonical display form.
 * - Canadian: "H2X 1Y4" (uppercase, space in middle)
 * - US: "90210" or "90210-1234" (trimmed)
 * Returns null if format is invalid.
 */
export function normalizePostalCode(
  postalCode: string
): { normalized: string; country: 'CA' | 'US' } | null {
  const trimmed = postalCode.trim();

  if (CA_POSTAL_REGEX.test(trimmed)) {
    const cleaned = trimmed.replace(/[\s-]/g, '').toUpperCase();
    return {
      normalized: `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`,
      country: 'CA',
    };
  }

  if (US_ZIP_REGEX.test(trimmed)) {
    return { normalized: trimmed, country: 'US' };
  }

  return null;
}

/**
 * Format raw input into LDL DLD (Canadian postal code) pattern as the user types.
 * Filters characters to enforce strict alternating Letter-Digit-Letter Digit-Letter-Digit.
 * Returns the formatted string with auto-inserted space (e.g. "H2X 1Y4").
 */
export function formatPostalCodeInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

  let filtered = '';
  for (let i = 0; i < cleaned.length && i < 6; i++) {
    const ch = cleaned[i];
    const isLetter = /[A-Z]/.test(ch);
    const isDigit = /[0-9]/.test(ch);
    // Positions 0,2,4 must be letters; positions 1,3,5 must be digits
    if ((i % 2 === 0 && isLetter) || (i % 2 === 1 && isDigit)) {
      filtered += ch;
    } else {
      break;
    }
  }

  return filtered.length > 3 ? `${filtered.slice(0, 3)} ${filtered.slice(3)}` : filtered;
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
  const cleaned = postalCode.replace(/[\s-]/g, '').toUpperCase();
  if (cleaned.length < 3) {
    return false;
  }
  const fsa = cleaned.slice(0, 3);
  return GMA_FSA_SET.has(fsa);
}
