/**
 * The data required to generate an HOTP key.
 *
 * https://tools.ietf.org/html/rfc4226
 */
export interface Token {
	/** An arbitrary key value. */
	readonly secret: ArrayBuffer

	/** One of: "SHA-1", "SHA-256", "SHA-512". */
	readonly algorithm: "SHA-1" | "SHA-256" | "SHA-512"

	/** Determines how long of a one-time passcode to display to the user. */
	readonly digits: 6 | 7 | 8

	/** The initial counter value. */
	readonly counter: number
}

export interface ImportedToken extends Omit<Token, "secret" | "algorithm"> {
	/** An arbitrary key value. */
	secret: CryptoKey
}

export const generate = async (
	{ secret, digits, counter }: ImportedToken
): Promise<string> => {
	// Step 1: Generate an HMAC-SHA-1 value Let HS = HMAC-SHA-1(K,C)
	const text = new Uint8Array(8)
	new DataView(text.buffer).setBigUint64(0, BigInt(counter))
	const signature = await window.crypto.subtle.sign("HMAC", secret, text)

	// Step 2: Generate a 4-byte string (Dynamic Truncation)
	const bytes = new Uint8Array(signature)
	const offset = bytes[bytes.length - 1] & 0b1111
	const truncated = new DataView(bytes.buffer).getUint32(offset) & 0x7fffffff

	// Step 3: Compute an HOTP value
	return String(truncated % 10 ** digits).padStart(digits, "0")
}

export const importSecret = (params: Pick<Token, "secret" | "algorithm">): Promise<CryptoKey> =>
	window.crypto.subtle.importKey(
		"raw",
		params.secret,
		{ name: "HMAC", hash: params.algorithm },
		true,
		["sign"]
	)
