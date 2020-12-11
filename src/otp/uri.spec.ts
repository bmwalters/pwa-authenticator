import { Token, parse, stringify } from "./uri"

const wellFormed: [string, string, Token][] = [
	// From https://github.com/google/google-authenticator/wiki/Key-Uri-Format
	[
		"otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example",
		"otpauth://totp/Example:alice%40google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30",
		{
			type: "totp",
			accountName: "alice@google.com",
			// prettier-ignore
			secret: new Uint8Array([
				0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad, 0xbe, 0xef
			]),
			issuer: "Example",
			algorithm: "SHA-1",
			digits: 6,
			period: 30,
		},
	],
	[
		"otpauth://totp/ACME%20Co:john.doe@email.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME%20Co&algorithm=SHA1&digits=6&period=30",
		"otpauth://totp/ACME%20Co:john.doe%40email.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&issuer=ACME%20Co&algorithm=SHA1&digits=6&period=30",
		{
			type: "totp",
			accountName: "john.doe@email.com",
			// prettier-ignore
			secret: new Uint8Array([
				0x3d, 0xc6, 0xca, 0xa4, 0x82, 0x4a, 0x6d, 0x28, 0x87, 0x67, 0xb2,
				0x33, 0x1e, 0x20, 0xb4, 0x31, 0x66, 0xcb, 0x85, 0xd9
			]),
			issuer: "ACME Co",
			algorithm: "SHA-1",
			digits: 6,
			period: 30,
		},
	],
	// My own examples
	[
		"otpauth://hotp/foo?secret=AAAA&counter=42",
		"otpauth://hotp/foo?secret=AAAA&algorithm=SHA1&digits=6&counter=42",
		{
			type: "hotp",
			accountName: "foo",
			secret: new Uint8Array([0, 0]),
			issuer: undefined,
			algorithm: "SHA-1",
			digits: 6,
			counter: 42,
		},
	],
]

describe("parse", () => {
	it.each(wellFormed)("parses well-formed uri %p", (uri, full, result) => {
		expect(parse(uri)).toEqual(result)
		expect(parse(full)).toEqual(result)
	})
})

describe("stringify", () => {
	it.each(wellFormed)("stringifies token to uri", (_, result, token) => {
		expect(stringify(token)).toEqual(result)
	})
})
