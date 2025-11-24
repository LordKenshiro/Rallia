import { randomBytes } from "crypto";

export function generateUrlSafeToken() {
  return randomBytes(32).toString("base64url");
}
