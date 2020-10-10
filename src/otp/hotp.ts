// https://tools.ietf.org/html/rfc4226

import { HOTPToken } from './token'

export type HOTPParams = Pick<HOTPToken, "secret" | "algorithm" | "digits" | "counter">

export const generate = async (
	{ secret, algorithm, digits, counter }: HOTPParams
): Promise<string> => {
	// Step 1: Generate an HMAC-SHA-1 value Let HS = HMAC-SHA-1(K,C)
	// TODO: Keep this key persisted outside JS process at time of token scan.
	const digestAlgorithm = digestAlgorithms[algorithm]
	const key = await window.crypto.subtle.importKey(
		"raw",
		secret,
		{ name: "HMAC", hash: digestAlgorithm },
		false,
		["sign"]
	)
	const text = new Uint8Array(8)
	new DataView(text.buffer).setBigUint64(0, BigInt(counter))
	const signature = await window.crypto.subtle.sign("HMAC", key, text)

	// Step 2: Generate a 4-byte string (Dynamic Truncation)
	const bytes = new Uint8Array(signature)
	const offset = bytes[bytes.length - 1] & 0b1111
	const truncated = new DataView(bytes.buffer).getUint32(offset) & 0x7fffffff

	// Step 3: Compute an HOTP value
	return String(truncated % (10 ** digits)).padStart(digits, "0")
}

const digestAlgorithms: Record<HOTPToken["algorithm"], string> = {
	SHA1: "SHA-1",
	SHA256: "SHA-256",
	SHA512: "SHA-512",
}
