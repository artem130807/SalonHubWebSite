import { describe, expect, it } from "vitest";
import { createApp } from "@/server/application/create-app";
import { createInMemoryRepos } from "@/server/infrastructure/memory-repositories";
import { UserRole } from "@/server/domain/types";
import { hashRefreshToken } from "@/server/application/refresh-token";
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "@/lib/constants";
import type { IClock, IPasswordHasher, ITokenService, IVerificationCodeGenerator } from "@/server/application/ports";

class TestClock implements IClock {
  constructor(public now: Date) {}
  utcNow() {
    return this.now;
  }
  advance(ms: number) {
    this.now = new Date(this.now.getTime() + ms);
  }
}

const hasher: IPasswordHasher = {
  hash: async (password) => `hash:${password}`,
  verify: async (password, passwordHash) => passwordHash === `hash:${password}`,
};

const tokens: ITokenService = {
  sign: async (payload) => JSON.stringify(payload),
  verify: async (token) => JSON.parse(token),
};

const codes: IVerificationCodeGenerator = {
  generate: () => "123456",
};

async function verifiedClient(now = new Date("2026-09-03T08:00:00.000Z")) {
  const clock = new TestClock(now);
  const repos = createInMemoryRepos();
  const services = createApp({
    ...repos,
    hasher,
    tokens,
    codes,
    clock,
  });
  const registered = await services.auth.register(
    { name: "Иван", email: "ivan@test.com", phone: "+79991112233", password: "password1", role: UserRole.Client },
    true,
  );
  if (!registered.ok) throw new Error("register failed");
  await services.auth.verifyEmail("ivan@test.com", "123456");
  return { auth: services.auth, repos, clock };
}

describe("access + refresh tokens", () => {
  it("issues an access JWT payload and a hashed refresh token on login", async () => {
    const { auth, repos } = await verifiedClient();
    const login = await auth.login("ivan@test.com", "password1");
    expect(login.ok).toBe(true);
    if (!login.ok) return;
    expect(login.value.accessToken).toBeTruthy();
    expect(login.value.refreshToken).toBeTruthy();
    expect(login.value.accessTokenExpiresAt.getTime() - login.value.refreshTokenExpiresAt.getTime()).toBeLessThan(0);
    expect(repos.db.refreshTokens).toHaveLength(1);
    expect(repos.db.refreshTokens[0]?.tokenHash).toBe(hashRefreshToken(login.value.refreshToken));
    expect(repos.db.refreshTokens[0]?.tokenHash).not.toBe(login.value.refreshToken);
    expect(
      login.value.refreshTokenExpiresAt.getTime() - login.value.accessTokenExpiresAt.getTime(),
    ).toBe((REFRESH_TOKEN_TTL_SECONDS - ACCESS_TOKEN_TTL_SECONDS) * 1000);
  });

  it("rotates the refresh token and keeps the same family", async () => {
    const { auth, repos } = await verifiedClient();
    const login = await auth.login("ivan@test.com", "password1");
    if (!login.ok) return;
    const rotated = await auth.refresh(login.value.refreshToken);
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    expect(rotated.value.refreshToken).not.toBe(login.value.refreshToken);
    expect(repos.db.refreshTokens).toHaveLength(2);
    expect(repos.db.refreshTokens[0]?.familyId).toBe(repos.db.refreshTokens[1]?.familyId);
    expect(repos.db.refreshTokens[0]?.revokedAt).not.toBeNull();
    expect(repos.db.refreshTokens[1]?.revokedAt).toBeNull();
    const oldAgain = await auth.refresh(login.value.refreshToken);
    expect(oldAgain.ok).toBe(false);
  });

  it("revokes the whole family when a used refresh token is replayed", async () => {
    const { auth } = await verifiedClient();
    const login = await auth.login("ivan@test.com", "password1");
    if (!login.ok) return;
    const rotated = await auth.refresh(login.value.refreshToken);
    if (!rotated.ok) return;
    const replay = await auth.refresh(login.value.refreshToken);
    expect(replay.ok).toBe(false);
    const current = await auth.refresh(rotated.value.refreshToken);
    expect(current.ok).toBe(false);
  });

  it("rejects an expired refresh token", async () => {
    const { auth, clock } = await verifiedClient();
    const login = await auth.login("ivan@test.com", "password1");
    if (!login.ok) return;
    clock.advance((REFRESH_TOKEN_TTL_SECONDS + 1) * 1000);
    const expired = await auth.refresh(login.value.refreshToken);
    expect(expired.ok).toBe(false);
  });

  it("invalidates refresh tokens on logout", async () => {
    const { auth } = await verifiedClient();
    const login = await auth.login("ivan@test.com", "password1");
    if (!login.ok) return;
    const logout = await auth.logout(login.value.refreshToken);
    expect(logout.ok).toBe(true);
    const after = await auth.refresh(login.value.refreshToken);
    expect(after.ok).toBe(false);
    const peek = await auth.resolveRefresh(login.value.refreshToken);
    expect(peek.ok).toBe(false);
  });

  it("resolveRefresh accepts a live token without rotating it", async () => {
    const { auth, repos } = await verifiedClient();
    const login = await auth.login("ivan@test.com", "password1");
    if (!login.ok) return;
    const peek = await auth.resolveRefresh(login.value.refreshToken);
    expect(peek.ok).toBe(true);
    expect(repos.db.refreshTokens).toHaveLength(1);
    expect(repos.db.refreshTokens[0]?.revokedAt).toBeNull();
  });

  it("logout of one session does not revoke another device family", async () => {
    const { auth } = await verifiedClient();
    const first = await auth.login("ivan@test.com", "password1");
    const second = await auth.login("ivan@test.com", "password1");
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    await auth.logout(first.value.refreshToken);
    const firstDead = await auth.refresh(first.value.refreshToken);
    const secondAlive = await auth.refresh(second.value.refreshToken);
    expect(firstDead.ok).toBe(false);
    expect(secondAlive.ok).toBe(true);
  });

  it("rejects a second concurrent-style refresh of the same token", async () => {
    const { auth } = await verifiedClient();
    const login = await auth.login("ivan@test.com", "password1");
    if (!login.ok) return;
    const first = await auth.refresh(login.value.refreshToken);
    const second = await auth.refresh(login.value.refreshToken);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });
});
