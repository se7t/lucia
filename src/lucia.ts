import { Cookie, parseCookieHeader } from "./cookie.js";
import { generateIdFromEntropySizeWithWebCrypto } from "./utils.js";

export class Lucia<_Session extends LuciaSession, _User extends LuciaUser> {
	public sessionExpiresInSeconds: number;
	public sessionCookieName: string;
	public secureCookies: boolean;

	private adapter: DatabaseAdapter<_Session, _User>;

	constructor(
		adapter: DatabaseAdapter<_Session, _User>,
		options?: {
			sessionExpiresInSeconds?: number;
			sessionCookieName?: string;
			secureCookies?: boolean;
		}
	) {
		this.adapter = adapter;
		this.sessionExpiresInSeconds = options?.sessionExpiresInSeconds ?? 60 * 60 * 24 * 30;
		this.sessionCookieName = options?.sessionCookieName ?? "auth_session";
		this.secureCookies = options?.secureCookies ?? true;
	}

	public async validateSession(sessionId: string): Promise<SessionAndUser<_Session, _User>> {
		let session: _Session | null;
		let user: _User | null;
		try {
			const result = await this.adapter.getSessionAndUser(sessionId);
			session = result.session;
			user = result.user;
		} catch (e) {
			throw new DatabaseError("Failed to get session and user", e);
		}
		if (session === null || user === null) {
			return { session: null, user: null };
		}
		if (Date.now() >= session.expiresAt.getTime()) {
			try {
				await this.adapter.deleteSession(sessionId);
			} catch (e) {
				throw new DatabaseError("Failed to delete session", e);
			}
			return { session: null, user: null };
		}
		if (Date.now() >= session.expiresAt.getTime() - (this.sessionExpiresInSeconds * 1000) / 2) {
			session.expiresAt = this.getNewSessionExpiration();
			try {
				await this.adapter.updateSessionExpiration(session.id, session.expiresAt);
			} catch (e) {
				throw new DatabaseError("Failed to update session expiration", e);
			}
		}
		return { session, user };
	}

	public async invalidateSession(sessionId: string): Promise<void> {
		try {
			await this.adapter.deleteSession(sessionId);
		} catch (e) {
			throw new DatabaseError("Failed to delete session", e);
		}
	}

	public getNewSessionExpiration(): Date {
		return new Date(Date.now() + this.sessionExpiresInSeconds * 1000);
	}

	public parseSessionCookie(cookieHeader: string): string | null {
		const cookies = parseCookieHeader(cookieHeader);
		return cookies.get(this.sessionCookieName);
	}

	public createSessionCookie(sessionId: string, expiresAt: Date | null): Cookie {
		const cookie = new Cookie(this.sessionCookieName, sessionId);
		if (expiresAt !== null) {
			cookie.setAttribute("Expires", expiresAt.toUTCString());
		} else {
			cookie.setAttribute("Expires", new Date(Date.now() + 60 * 60 * 24 * 365).toUTCString());
		}
		cookie.setAttribute("SameSite", "Lax");
		cookie.setAttribute("Path", "/");
		cookie.setFlag("HttpOnly");
		if (this.secureCookies) {
			cookie.setFlag("Secure");
		}
		return cookie;
	}

	public createBlankSessionCookie(): Cookie {
		const cookie = new Cookie(this.sessionCookieName, "");
		cookie.setAttribute("Max-Age", "0");
		cookie.setAttribute("SameSite", "Lax");
		cookie.setAttribute("Path", "/");
		cookie.setFlag("HttpOnly");
		if (this.secureCookies) {
			cookie.setFlag("Secure");
		}
		return cookie;
	}
}

export class DatabaseError extends Error {
	constructor(message: string, cause: any) {
		super(`Database error: ${message}`, {
			cause
		});
	}
}

export function generateSessionIdWithWebCrypto(): string {
	return generateIdFromEntropySizeWithWebCrypto(25);
}

export interface DatabaseAdapter<_Session extends LuciaSession, _User extends LuciaUser> {
	getSessionAndUser(sessionId: string): Promise<SessionAndUser<_Session, _User>>;
	deleteSession(sessionId: string): Promise<void>;
	updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void>;
}

export type SessionAndUser<_Session extends LuciaSession, _User extends LuciaUser> =
	| {
			session: _Session;
			user: _User;
	  }
	| {
			session: null;
			user: null;
	  };

export interface LuciaSession {
	id: string;
	expiresAt: Date;
}

export interface LuciaUser {}
