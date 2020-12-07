import { ImportedToken as HOTPToken } from "./otp/hotp.js"
import { ImportedToken as TOTPToken } from "./otp/totp.js"
import { Token as OTPAuthToken } from "./otp/uri.js"
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
	backupPublicKey: {
		key: "current"
		value: {
			key: CryptoKey
			fingerprint: string
		}
	}
	backup: {
		key: number
		value: {
			secret: ArrayBuffer
			publicKeyFingerprint: string
		}
	}
}

const openDatabase = () => openDB<AuthenticatorDatabase>("authenticator", 1, {
	upgrade(db) {
		db.createObjectStore("tokens", { autoIncrement: true })
		db.createObjectStore("backupPublicKey")
		db.createObjectStore("backup")
	}
})

export const listTokens = async (): Promise<StoredToken[]> => {
	const db = await openDatabase()
	return await db.getAll("tokens")
}

/**
 * Generates a backup keypair, persisting the public key and returning
 * the corresponding private key in PEM format.
 */
export const initializeBackup = async (): Promise<string> => {
	const keypair = await window.crypto.subtle.generateKey(
		{
			name: "RSA-OAEP",
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: "SHA-256",
		},
		true,
		["encrypt", "decrypt"],
	)

	const publicKeyFingerprint = "SHA256:" + arrayBufferToBase64(
		await window.crypto.subtle.digest(
			"SHA-256",
			await window.crypto.subtle.exportKey("spki", keypair.publicKey),
		)
	)

	const db = await openDatabase()
	await db.put(
		"backupPublicKey",
		{ key: keypair.publicKey, fingerprint: publicKeyFingerprint },
		"current"
	)

	return await privateKeyToPEM(keypair.privateKey)
}

export class BackupNotInitializedError extends Error {}

export const addTokenAndBackup = async (token: StoredToken, secret: ArrayBuffer): Promise<void> => {
	// TODO: Is it safe to reopen the DB in every add/list method?
	const db = await openDatabase()

	const publicKey = await db.get("backupPublicKey", "current")
	if (!publicKey)
		throw new BackupNotInitializedError()

	const ciphertext = await window.crypto.subtle.encrypt(
		{ name: "RSA-OAEP" },
		publicKey.key,
		secret,
	)

	const tx = db.transaction(["tokens", "backup"], "readwrite", { durability: "strict" })
	const tokenId = await tx.objectStore("tokens").add(token)
	await tx.objectStore("backup").add(
		{ secret: ciphertext, publicKeyFingerprint: publicKey.fingerprint },
		tokenId
	)
	await tx.done
}

const arrayBufferToBase64 = (buffer: ArrayBuffer): string =>
	window.btoa(String.fromCharCode(...new Uint8Array(buffer)))

const privateKeyToPEM = async (key: CryptoKey): Promise<string> => {
	const exported = await window.crypto.subtle.exportKey("pkcs8", key)
	const exportedBase64 = arrayBufferToBase64(exported)
	return `-----BEGIN PRIVATE KEY-----\n${exportedBase64}\n-----END PRIVATE KEY-----`
}
