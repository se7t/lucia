# Lucia

**[Documentation](https://v3.lucia-auth.com)**

**[Changelog](https://github.com/pilcrowOnPaper/lucia/blob/main/packages/lucia/CHANGELOG.md)**

An open-source auth library that works alongside your database to provide an API that's easy to use, understand, and extend.

```ts
const sessionId = lucia.parseSessionCookie(cookieHeader);
if (sessionId === null) {
	throw new Error("Invalid session");
}
const { session, user } = await lucia.validateSession(sessionId);
if (session === null) {
	throw new Error("Invalid session");
}
```

## Installation

```
npm install lucia
```
