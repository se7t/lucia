export function parseCookieHeader(header: string): Cookies {
	const cookies = new Cookies();
	const parts = header.split(";");
	for (let part of parts) {
		part = part.trim();
		// "=" is valid in the cookie value
		const firstEqualPosition = part.indexOf("=");
		if (firstEqualPosition < 0) {
			continue;
		}
		cookies.set(part.slice(0, firstEqualPosition), part.slice(firstEqualPosition + 1));
	}
	return cookies;
}

export class Cookies {
	private cookies = new Map<string, string>();

	public set(name: string, value: string): void {
		this.cookies.set(name, value);
	}

	public get(name: string): string | null {
		const encoded = this.cookies.get(name);
		if (encoded === undefined) {
			return null;
		}
		return decodeURIComponent(encoded);
	}

	public getNoDecoding(name: string): string | null {
		return this.cookies.get(name) ?? null;
	}

	public has(name: string): boolean {
		return this.cookies.has(name);
	}
}

export class Cookie {
	public name: string;
	public value: string;

	private attributes = new Map<string, string>();
	private flags = new Set<string>();

	constructor(name: string, value: string) {
		this.name = name;
		this.value = value;
	}

	public setAttribute(name: string, value: string): void {
		this.attributes.set(name.toLowerCase(), value);
	}

	public deleteAttribute(name: string): void {
		this.attributes.delete(name.toLowerCase());
	}

	public hasAttribute(name: string): boolean {
		return this.attributes.has(name);
	}

	public setFlag(name: string): void {
		this.flags.add(name.toLowerCase());
	}

	public deleteFlag(name: string): void {
		this.flags.delete(name.toLowerCase());
	}

	public hasFlag(name: string): boolean {
		return this.flags.has(name);
	}

	public serialize(): string {
		let serialized = `${this.name}=${encodeURIComponent(this.value)}`;
		for (const [name, value] of this.attributes) {
			serialized += `; ${name}=${value}`;
		}
		for (const flag of this.flags) {
			serialized += `; ${flag}`;
		}
		return serialized;
	}

	public serializeNoEncoding(): string {
		let serialized = `${this.name}=${this.value}`;
		for (const [name, value] of this.attributes) {
			serialized += `; ${name}=${value}`;
		}
		for (const flag of this.flags) {
			serialized += `; ${flag}`;
		}
		return serialized;
	}

	public npmCookieOptions(): NPMCookieOptions {
		const options: NPMCookieOptions = {};
		const domain = this.attributes.get("domain") ?? null;
		if (domain !== null) {
			options.domain = domain;
		}
		const expires = this.attributes.get("expires") ?? null;
		if (expires !== null) {
			options.expires = new Date(expires);
		}
		const maxAge = this.attributes.get("max-age") ?? null;
		if (maxAge !== null) {
			options.maxAge = Number(maxAge);
		}
		const priority = this.attributes.get("priority")?.toLowerCase() ?? null;
		if (priority !== null) {
			if (priority === "low" || priority === "medium" || priority === "high") {
				options.priority = priority;
			} else {
				throw new Error(`Invalid 'Priority' value: '${priority}'`);
			}
		}
		const path = this.attributes.get("path") ?? null;
		if (path !== null) {
			options.path = path;
		}
		const sameSite = this.attributes.get("samesite")?.toLowerCase() ?? null;
		if (sameSite !== null) {
			if (sameSite === "lax" || sameSite === "strict" || sameSite === "none") {
				options.sameSite = sameSite;
			} else {
				throw new Error(`Invalid 'SameSite' value: '${sameSite}'`);
			}
		}
		if (this.flags.has("http-only")) {
			options.httpOnly = true;
		}
		if (this.flags.has("partitioned")) {
			options.partitioned = true;
		}
		if (this.flags.has("secure")) {
			options.secure = true;
		}
		return options;
	}
}

export interface NPMCookieOptions {
	domain?: string;
	expires?: Date;
	httpOnly?: boolean;
	maxAge?: number;
	partitioned?: boolean;
	path?: string;
	priority?: "low" | "medium" | "high";
	sameSite?: "lax" | "strict" | "none";
	secure?: boolean;
}
