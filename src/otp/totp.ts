// https://tools.ietf.org/html/rfc6238

import { TOTPToken } from './token'
import { generate as hotp } from './hotp.js'

export type TOTPParams = Pick<TOTPToken, "secret" | "algorithm" | "digits" | "period">

export const generate = (
	{ secret, algorithm, digits, period }: TOTPParams,
	date: Date
): Promise<string> => hotp({
	secret,
	algorithm,
	digits,
	counter: Math.floor((date.getTime() / 1000) / period)
})
