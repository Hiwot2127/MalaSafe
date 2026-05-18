const SESSION_COOKIE = 'mala_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export function setSessionCookie(token: string | null) {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  if (token) {
    document.cookie = `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Strict${secure}`;
  } else {
    document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict${secure}`;
  }
}
