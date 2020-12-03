import {
	Token as HOTPToken,
	ImportedToken as ImportedHOTPToken,
	generate as hotp,
} from './hotp.js'

/**
 * The data required to generate a TOTP key.
 *
 * https://tools.ietf.org/html/rfc6238
 */
export interface Token extends Omit<HOTPToken, "counter"> {
	/** A period that a TOTP code will be valid for, in seconds. */
	period: number
}

export interface ImportedToken extends Omit<Token, "secret"> {
	secret: ImportedHOTPToken["secret"]
}

export const generate = (
	{ secret, digits, period }: ImportedToken,
	date: Date
): Promise<string> => hotp({
	secret,
	digits,
	counter: Math.floor((date.getTime() / 1000) / period)
})
