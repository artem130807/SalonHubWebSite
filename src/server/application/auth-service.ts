import { randomUUID } from "node:crypto";
import { err, ok, type Result } from "@/server/domain/result";
import { UserRole, type RefreshTokenRecord, type User } from "@/server/domain/types";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@/lib/constants";
import { generateRefreshToken, hashRefreshToken } from "@/server/application/refresh-token";
import type {
  IClock,
  ICityCatalog,
  IEmailVerificationRepository,
  IMasterProfileRepository,
  IPasswordHasher,
  IRefreshTokenRepository,
  ISalonAdminRepository,
  ITokenService,
  IUserRepository,
  IVerificationCodeGenerator,
  SessionPayload,
} from "@/server/application/ports";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_RE = /^(\+7|7|8)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;
const VERIFICATION_MS = 15 * 60 * 1000;

export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  city: string;
  role?: UserRole;
};

export type AuthTokenPair = SessionPayload & {
  email: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
};

export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly verifications: IEmailVerificationRepository,
    private readonly masters: IMasterProfileRepository,
    private readonly salonAdmins: ISalonAdminRepository,
    private readonly refreshTokens: IRefreshTokenRepository,
    private readonly hasher: IPasswordHasher,
    private readonly tokens: ITokenService,
    private readonly codes: IVerificationCodeGenerator,
    private readonly clock: IClock,
    private readonly cities: ICityCatalog,
  ) {}

  async register(input: RegisterInput, includeCode: boolean) {
    if (!input.password || input.password.length < 8) {
      return err("Пароль должен содержать минимум 8 символов");
    }
    if ((input.role ?? UserRole.Client) === UserRole.Master) {
      return err("Мастера создаёт администратор салона");
    }
    const email = input.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return err("Некорректный email");
    if (!PHONE_RE.test(input.phone.trim())) return err("Номер не соответствует формату");
    if (!input.name.trim()) return err("Имя обязательно");
    if (!input.city?.trim()) return err("Вы не указали город");
    const city = this.cities.canonical(input.city);
    if (!city) return err("Вы указали неверный город");

    if (await this.users.getByEmail(email)) {
      return err("Пользователь с таким email уже существует");
    }

    const now = this.clock.utcNow();
    const user: User = {
      id: randomUUID(),
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      passwordHash: await this.hasher.hash(input.password),
      role: input.role ?? UserRole.Client,
      emailVerified: false,
      city,
      createdAt: now,
    };
    const code = this.codes.generate();
    await this.users.add(user);
    await this.verifications.add({
      id: randomUUID(),
      email,
      codeHash: await this.hasher.hash(code),
      createdAt: now,
      expiresAt: new Date(now.getTime() + VERIFICATION_MS),
      isUsed: false,
    });

    return ok({
      userId: user.id,
      email,
      verificationCode: includeCode ? code : undefined,
    });
  }

  async verifyEmail(emailRaw: string, code: string): Promise<Result> {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.users.getByEmail(email);
    if (!user) return err("Пользователь не найден");
    const verification = await this.verifications.getActiveByEmail(email);
    if (!verification) return err("Код подтверждения не найден");
    if (!(await this.hasher.verify(code, verification.codeHash))) {
      return err("Неверный код подтверждения");
    }
    if (verification.isUsed) return err("Код уже использован");
    if (this.clock.utcNow() >= verification.expiresAt) return err("Срок действия кода истёк");
    await this.verifications.markUsed(verification.id);
    await this.users.markEmailVerified(user.id);
    return ok(undefined);
  }

  async login(emailRaw: string, password: string) {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.users.getByEmail(email);
    if (!user || !(await this.hasher.verify(password, user.passwordHash))) {
      return err("Неверный email или пароль");
    }
    if (!user.emailVerified) return err("Email не подтверждён");
    return this.issueTokenPair(user);
  }

  async refresh(rawRefreshToken: string) {
    const stored = await this.loadRefresh(rawRefreshToken);
    if (!stored.ok) return stored;
    const now = this.clock.utcNow();
    if (now >= stored.value.expiresAt) {
      await this.refreshTokens.revokeFamily(stored.value.familyId, now);
      return err("Срок действия refresh-токена истёк");
    }
    const claimed = await this.refreshTokens.claimIfActive(stored.value.id, now);
    if (!claimed) {
      await this.refreshTokens.revokeFamily(stored.value.familyId, now);
      return err("Refresh-токен уже использован");
    }
    const user = await this.users.getById(stored.value.userId);
    if (!user) {
      await this.refreshTokens.revokeFamily(stored.value.familyId, now);
      return err("Пользователь не найден");
    }
    const pair = await this.issueTokenPair(user, stored.value.familyId);
    if (pair.ok) {
      await this.refreshTokens.setReplacedBy(stored.value.id, pair.value.refreshTokenId);
    }
    return pair;
  }

  async resolveRefresh(rawRefreshToken: string) {
    const stored = await this.loadRefresh(rawRefreshToken);
    if (!stored.ok) return stored;
    const now = this.clock.utcNow();
    if (stored.value.revokedAt || now >= stored.value.expiresAt) {
      return err("Недействительный refresh-токен");
    }
    return ok({ userId: stored.value.userId });
  }

  async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const stored = await this.loadRefresh(rawRefreshToken);
      if (stored.ok) {
        await this.refreshTokens.revokeFamily(stored.value.familyId, this.clock.utcNow());
      }
    }
    return ok(undefined);
  }

  async current(userId: string) {
    const user = await this.users.getById(userId);
    if (!user) return err("Пользователь не найден");
    const payload = await this.toSession(user);
    return ok({
      ...payload,
      email: user.email,
      phone: user.phone,
      city: user.city ?? null,
      emailVerified: user.emailVerified,
    });
  }

  async toSession(user: User): Promise<SessionPayload> {
    if (user.role === UserRole.Master) {
      const master = await this.masters.getByUserId(user.id);
      return {
        userId: user.id,
        role: user.role,
        name: user.name,
        masterProfileId: master?.id,
        salonId: master?.salonId,
      };
    }
    if (user.role === UserRole.SalonAdmin) {
      const admin = await this.salonAdmins.getByUserId(user.id);
      return {
        userId: user.id,
        role: user.role,
        name: user.name,
        salonId: admin?.salonId,
      };
    }
    return { userId: user.id, role: user.role, name: user.name };
  }

  private async issueTokenPair(user: User, familyId: string = randomUUID()) {
    const now = this.clock.utcNow();
    const payload = await this.toSession(user);
    const accessToken = await this.tokens.sign(payload);
    const refreshToken = generateRefreshToken();
    const refreshTokenId = randomUUID();
    const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000);
    const record: RefreshTokenRecord = {
      id: refreshTokenId,
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      familyId,
      expiresAt: refreshTokenExpiresAt,
      revokedAt: null,
      replacedById: null,
      createdAt: now,
    };
    await this.refreshTokens.add(record);
    const pair: AuthTokenPair & { refreshTokenId: string } = {
      ...payload,
      email: user.email,
      accessToken,
      refreshToken,
      refreshTokenId,
      accessTokenExpiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000),
      refreshTokenExpiresAt,
    };
    return ok(pair);
  }

  private async loadRefresh(rawRefreshToken: string) {
    if (!rawRefreshToken.trim()) return err("Недействительный refresh-токен");
    const stored = await this.refreshTokens.getByTokenHash(hashRefreshToken(rawRefreshToken));
    if (!stored) return err("Недействительный refresh-токен");
    return ok(stored);
  }
}
