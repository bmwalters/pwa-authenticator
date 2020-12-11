import { ImportedToken as HOTPToken } from "./otp/hotp.js"
import { ImportedToken as TOTPToken } from "./otp/totp.js"
import { encodeSharedSecret as encodeSteamguardSecret } from './otp/steamguard.js'
import { Token as OTPAuthToken, stringify } from "./otp/uri.js"
import { openDB as openDB, DBSchema } from "idb"

type TokenLabelProps = Pick<OTPAuthToken, "accountName" | "issuer">
export type StoredToken =
	| (HOTPToken & { readonly type: "hotp" } & TokenLabelProps)
	| (TOTPToken & { readonly type: "totp" } & TokenLabelProps)
	| (
		& { readonly type: "steamguard" }
		& Pick<HOTPToken, "secret">
		& Pick<TokenLabelProps, "accountName">
	)

interface AuthenticatorDatabase extends DBSchema {
	tokens: {
		key: number
		value: StoredToken
	}
}

const openDatabase = () => openDB<AuthenticatorDatabase>("authenticator", 1, {
	upgrade(db) {
		db.createObjectStore("tokens", { autoIncrement: true })
	}
})

export const listTokens = async (): Promise<StoredToken[]> => {
	const db = await openDatabase()
	return await db.getAll("tokens")
}

export const addToken= async (token: StoredToken): Promise<void> => {
	// TODO: Is it safe to reopen the DB in every add/list method?
	const db = await openDatabase()
	await db.add("tokens", token)
}

/**
 * https://github.com/andOTP/andOTP/wiki/Backup-encryption
 */
export const createBackup = async (passphrase: string): Promise<ArrayBuffer> => {
	const tokens = await listTokens()
	const tokenStrings = await Promise.all(
		tokens.map(async (token) => {
			const secretAlgorithm = token.secret.algorithm.name
			if (secretAlgorithm !== "HMAC")
				throw new Error(`bad token secret algorithm: ${secretAlgorithm}`)

			let hash = (token.secret.algorithm as HmacKeyGenParams).hash
			if (typeof hash !== "string") hash = hash.name
			if (
				hash !== "SHA-1" as const &&
				hash !== "SHA-256" as const &&
				hash !== "SHA-512" as const
			)
				throw new Error(`bad token secret hash algorithm: ${hash}`)

			const secret = await window.crypto.subtle.exportKey("raw", token.secret)

			switch (token.type) {
			case "steamguard":
				return JSON.stringify({
					...token,
					secret: await encodeSteamguardSecret(secret)
				})
			case "hotp":
			case "totp":
				return stringify({ ...token, algorithm: hash, secret })
			}
		})
	)
	const backupString = tokenStrings.join("\n")

	const iterations = 100_000
	const salt = window.crypto.getRandomValues(new Uint8Array(12))
	const encryptionAlgorithm = { name: "AES-GCM", length: 256 }
	const key = await window.crypto.subtle.deriveKey(
		{ name: "PBKDF2", hash: "SHA-1", salt, iterations },
		await window.crypto.subtle.importKey(
			"raw",
			new TextEncoder().encode(passphrase),
			"PBKDF2",
			false,
			["deriveBits", "deriveKey"],
		),
		encryptionAlgorithm,
		false,
		["encrypt"],
	)

	const iv = window.crypto.getRandomValues(new Uint8Array(12))
	const ciphertext = new Uint8Array(await window.crypto.subtle.encrypt(
		{ ...encryptionAlgorithm, iv },
		key,
		new TextEncoder().encode(backupString),
	))

	const iterationsBuffer = new Uint8Array(4)
	new DataView(
		iterationsBuffer.buffer,
		iterationsBuffer.byteOffset,
		iterationsBuffer.byteLength
	).setUint32(0, iterations, false)

	const resultBuffer = new Uint8Array(
		iterationsBuffer.length +
		salt.length +
		iv.length +
		new Uint8Array(ciphertext).length
	)
	resultBuffer.set(iterationsBuffer, 0)
	resultBuffer.set(salt, iterationsBuffer.length)
	resultBuffer.set(iv, iterationsBuffer.length + salt.length)
	resultBuffer.set(ciphertext, iterationsBuffer.length + salt.length + iv.length)

	return resultBuffer
}
