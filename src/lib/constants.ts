export const ACCESS_COOKIE = "access";
export const REFRESH_COOKIE = "refresh";
/** @deprecated Use ACCESS_COOKIE. Kept so older session cookies still open protected routes. */
export const SESSION_COOKIE = ACCESS_COOKIE;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
