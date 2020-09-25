// https://github.com/google/google-authenticator/wiki/Key-Uri-Format
// otpauth://TYPE/LABEL?PARAMETERS

import { Token } from "./token"
import * as base32 from "./base32.js"

/**
 * Attempts to parse the given string as an
 * [otpauth URI](https://github.com/google/google-authenticator/wiki/Key-Uri-Format).
 *
 * @param uri the uri string to parse
 * @returns parsed token
 * @throws ParseError if an error occurred during parsing
 */
export const parse = (uriString: string): Token => {
	const match = uriString.match(otpauthRegExp)
	if (!match) throw new ParseError(`invalid otpauth uri`)

	const [_, type, label, searchParameters] = match

	if (type !== "hotp" && type !== "totp")
		throw new ParseError("otpauth uri type must be 'hotp' or 'totp'")

	const { accountName, issuer: labelIssuer } = parseLabel(label)

	const parameters = new URLSearchParams(searchParameters)

	const encodedSecret = parameters.get("secret")
	if (!encodedSecret)
		throw new ParseError("otpauth uri is missing 'secret' parameter")
	const secret = base32.decode(encodedSecret)

	const issuer = parameters.get("issuer") ?? labelIssuer
	if (issuer !== labelIssuer)
		throw new ParseError("otpauth uri issuer parameter must equal label issuer")

	const algorithm = parameters.get("algorithm") ?? "SHA1"
	if (
		algorithm !== ("SHA1" as const) &&
		algorithm !== ("SHA256" as const) &&
		algorithm !== ("SHA512" as const)
	)
		throw new ParseError("otpauth uri algorithm must be SHA1/SHA256/SHA512")

	const digits = Number(parameters.get("digits") ?? "6")
	if (
		digits !== (6 as const) &&
		digits !== (7 as const) &&
		digits !== (8 as const)
	)
		throw new ParseError("otpauth uri digits must be 6, 7, or 8")

	const baseProperties = {
		type,
		accountName,
		secret,
		issuer,
		algorithm,
		digits,
	}

	if (type === "hotp") {
		const counter = Number(parameters.get("counter") ?? "NaN")
		if (isNaN(counter))
			throw new ParseError("hotp otpauth uri counter must be a number")

		return { ...baseProperties, type, counter }
	} else {
		const period = Number(parameters.get("period") ?? "30")
		if (isNaN(period))
			throw new ParseError("totp otpauth uri period must be a number")

		return { ...baseProperties, type, period }
	}
}

export class ParseError extends Error {}

/** A RegExp that extracts significant portions of an otpauth uri. */
const otpauthRegExp = /^otpauth:\/\/(hotp|totp)\/(.*?)(\?.*)$/

/** Parses the accountName and issuer from an otpauth uri label. */
const parseLabel = (
	label: string,
): { accountName: string; issuer?: string } => {
	const [part1, part2] = decodeURIComponent(label).split(/: */)
	return { accountName: part2 ?? part1, issuer: part2 ? part1 : undefined }
}

/**
 * Encodes the given token as an
 * [otpauth URI](https://github.com/google/google-authenticator/wiki/Key-Uri-Format).
 *
 * @param token the token to encode
 * @returns otpauth URI string
 */
export const stringify = (token: Token): string => {
	// TODO
	return ""
}
