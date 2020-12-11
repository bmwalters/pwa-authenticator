import { importSecret as importHOTPSecret } from "./hotp.js"

const alphabet = [
	"2", "3", "4", "5", "6", "7", "8", "9", "B", "C",
	"D", "F", "G", "H", "J", "K", "M", "N", "P", "Q",
	"R", "T", "V", "W", "X", "Y"
]

export const generate = async (secret: CryptoKey, date: Date): Promise<string> => {
	// Step 1: Generate an HMAC-SHA-1 value Let HS = HMAC-SHA-1(K,C)
	const counter = Math.floor((date.getTime() / 1000) / 30)
	const text = new Uint8Array(8)
	new DataView(text.buffer).setBigUint64(0, BigInt(counter))
	const signature = await window.crypto.subtle.sign("HMAC", secret, text)

	// Step 2: Generate a 4-byte string (Dynamic Truncation)
	const bytes = new Uint8Array(signature)
	const offset = bytes[bytes.length - 1] & 0b1111
	const truncated = new DataView(bytes.buffer).getUint32(offset) & 0x7fffffff

	// Step 3: Compute a Steamguard OTP value
	const radix = alphabet.length
	let value = truncated
	let output = ""
	for (let i = 0; i < 5; i++) {
		output += alphabet[value % radix]
		value = Math.floor(value / radix)
	}

	return output
}

export const importSharedSecret = (sharedSecret: string): Promise<CryptoKey> =>
	importHOTPSecret({
		secret: base64Decode(sharedSecret),
		algorithm: "SHA-1",
	})

export const encodeSharedSecret = (sharedSecret: ArrayBuffer): string =>
	base64Encode(sharedSecret)

const base64Decode = (base64: string): ArrayBuffer =>
	Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

const base64Encode = (data: ArrayBuffer): string =>
	btoa(Array.from(new Uint8Array(data), (b) => String.fromCharCode(b)).join(''))
