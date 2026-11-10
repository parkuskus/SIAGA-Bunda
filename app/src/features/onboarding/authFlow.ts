import { validatePassword } from "./passwordPolicy.ts";

type AuthResult = { error: unknown | null };

type AuthClient = {
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<AuthResult & {
    data?: { session?: { user?: { id?: string } } | null };
  }>;
};

export async function loginWithPassword(
  auth: Pick<AuthClient, "signInWithPassword">,
  email: string,
  password: string,
): Promise<string> {
  const { data, error } = await auth.signInWithPassword({ email, password });
  if (error) throw new Error("Email atau sandi tidak cocok");
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error("Sesi masuk tidak ditemukan. Coba masuk kembali.");
  return userId;
}

export function hasVerifiedMfaToken(token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return false;
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))) as Record<string, unknown>;
    return payload.app_mfa_verified === true;
  } catch {
    return false;
  }
}

export function maskEmail(email: string): string {
  const [local, domain] = email.trim().split("@");
  if (!local || !domain) return "alamat email";
  return `${local[0]}***@${domain}`;
}

export async function verifyPasswordRecoveryOtp(
  auth: { verifyOtp: (input: { email: string; token: string; type: "recovery" }) => Promise<AuthResult & {
    data?: { session?: { access_token?: string } | null };
  }> },
  email: string,
  token: string,
): Promise<void> {
  const { data, error } = await auth.verifyOtp({ email, token, type: "recovery" });
  if (error || !data?.session?.access_token) throw new Error("Kode salah atau kedaluwarsa");
}

export async function completePasswordReset(
  auth: {
    updateUser: (attributes: { password: string }) => Promise<AuthResult>;
    signOut: (options: { scope: "local" }) => Promise<AuthResult>;
  },
  password: string,
  confirmation: string,
): Promise<void> {
  const validationError = validatePassword(password, confirmation);
  if (validationError) throw new Error(validationError);
  const { error } = await auth.updateUser({ password });
  if (error) throw new Error("Gagal memperbarui sandi. Coba lagi.");
  await auth.signOut({ scope: "local" });
}
