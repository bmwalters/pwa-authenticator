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
}

const openDatabase = () => openDB<AuthenticatorDatabase>("authenticator", 1, {
	upgrade(db) {
		db.createObjectStore("tokens", { autoIncrement: true })
	}
})

export const addToken = async (token: StoredToken): Promise<void> => {
	// anti-pattern if listtokens is called twice before completing once?
	const db = await openDatabase()
	await db.add("tokens", token)
}

export const listTokens = async (): Promise<StoredToken[]> => {
	const db = await openDatabase()
	return await db.getAll("tokens")
}

// Brainstorming idea for encrypted backups:
// - During onboarding:
//   - Generate keypair.
//   - Have user transfer private key via share sheet, then destroy.
//   - Store public key in database.
// - When adding new token:
//   - Call importSecret to get CryptoKey from secret, then addToken().
//     - Note: CryptoKey is non-exportable.
//   - Retrieve public key and encrypt secret. Store ciphertext in db.
//   - Destroy plaintext secret.
// - When opening app:
//   - Call listTokens() and use generate() with CryptoKeys.
// - When exporting backup:
//   - List all ciphertext from db and transfer via share sheet.
//   - User uses private key on another device to decrypt secrets.
//
// With this system, the plaintext secret can never be exported.
// The usable CryptoKey is marked as non-exportable.
// The encrypted secret requires the private key to decrypt.
//
// Alternatives:
// - Just make CryptoKeys exportable.
// - Just have ciphertext db, require decrypt on app open.
// - Use symmetric crypto instead of public/private key crypto.
