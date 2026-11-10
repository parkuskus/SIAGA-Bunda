import test from "node:test";
import assert from "node:assert/strict";
import { validatePassword } from "./passwordPolicy.ts";
import { completePasswordReset, hasVerifiedMfaToken, loginWithPassword, maskEmail, verifyPasswordRecoveryOtp } from "./authFlow.ts";

function jwt(claims) {
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `header.${encoded}.signature`;
}

test("password policy requires at least eight characters", () => {
  assert.equal(validatePassword("Abc123!", "Abc123!"), "Sandi minimal 8 karakter");
  assert.equal(validatePassword("Abc12345", "Abc12345"), null);
});

test("password policy requires matching confirmation", () => {
  assert.equal(validatePassword("Abc12345", "Abc12346"), "Konfirmasi sandi tidak sama");
});

test("wrong password returns one generic error", async () => {
  const auth = { signInWithPassword: async () => ({ error: new Error("email not found") }) };
  await assert.rejects(loginWithPassword(auth, "nobody@example.id", "bad"), {
    message: "Email atau sandi tidak cocok",
  });
});

test("successful password login returns its user ID without a second-factor call", async () => {
  const auth = { signInWithPassword: async () => ({ data: { session: { user: { id: "user-1" } } }, error: null }) };
  assert.equal(await loginWithPassword(auth, "bunda@example.id", "secret"), "user-1");
});

test("recovery OTP is checked by Supabase as a recovery token", async () => {
  let input;
  await verifyPasswordRecoveryOtp({ verifyOtp: async (value) => { input = value; return { data: { session: { access_token: "recovery" } }, error: null }; } }, "bunda@example.id", "123456");
  assert.deepEqual(input, { email: "bunda@example.id", token: "123456", type: "recovery" });
});

test("invalid recovery OTP is rejected", async () => {
  await assert.rejects(verifyPasswordRecoveryOtp({ verifyOtp: async () => ({ error: new Error("expired") }) }, "bunda@example.id", "000000"), /Kode salah atau kedaluwarsa/);
});

test("MFA claim parser fails closed on malformed tokens and string claims", () => {
  assert.equal(hasVerifiedMfaToken("bad-token"), false);
  assert.equal(hasVerifiedMfaToken(jwt({ app_mfa_verified: "true" })), false);
});

test("OTP screen masks all but the first email character", () => {
  assert.equal(maskEmail("bunda@example.id"), "b***@example.id");
});

test("password reset validates the new password, updates Auth, and clears its session", async () => {
  const calls = [];
  const auth = {
    updateUser: async (attributes) => { calls.push(["update", attributes]); return { error: null }; },
    signOut: async (options) => { calls.push(["signOut", options]); return { error: null }; },
  };
  await completePasswordReset(auth, "NewPass123", "NewPass123");
  assert.deepEqual(calls, [["update", { password: "NewPass123" }], ["signOut", { scope: "local" }]]);
});

test("password reset rejects mismatch without updating Auth", async () => {
  let updated = false;
  const auth = { updateUser: async () => { updated = true; return { error: null }; }, signOut: async () => ({ error: null }) };
  await assert.rejects(completePasswordReset(auth, "NewPass123", "OtherPass"), /Konfirmasi sandi tidak sama/);
  assert.equal(updated, false);
});
