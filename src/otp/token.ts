/** Defines fields present in HOTP and TOTP tokens. */
interface TokenBase {
	/** An account name. */
	readonly accountName: string

	/** An arbitrary key value. */
	readonly secret: ArrayBuffer

	/** The provider or service this account is associated with. */
	readonly issuer?: string

	/** One of: "SHA1", "SHA256", "SHA512". */
	readonly algorithm: "SHA1" | "SHA256" | "SHA512"

	/** Determines how long of a one-time passcode to display to the user. */
	readonly digits: 6 | 7 | 8
}

/** The data required to generate an HOTP key. */
export type HOTPToken = TokenBase & {
	readonly type: "hotp"

	/** The initial counter value. */
	readonly counter: number
}

/** The data required to generate a TOTP key. */
export type TOTPToken = TokenBase & {
	readonly type: "totp"

	/** A period that a TOTP code will be valid for, in seconds. */
	readonly period: number
}

/** The data required to generate a Steamguard OTP. */
export interface SteamguardToken {
	readonly type: "steamguard"

	/** Steam account name. */
	readonly accountName: string

	/** TODO: Doc */
	readonly secret: ArrayBuffer
}

/** The data required to generate either a HOTP or TOTP key. */
export type Token = HOTPToken | TOTPToken | SteamguardToken
