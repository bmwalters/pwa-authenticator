import { generate } from './totp'

/**
 * WebCrypto Mocks
 */

// order: sha1, sha256, sha512
const testSecrets = [
	new TextEncoder().encode("12345678901234567890"),
	new TextEncoder().encode("12345678901234567890123456789012"),
	new TextEncoder().encode("1234567890123456789012345678901234567890123456789012345678901234"),
]

const knownHMACValues: Partial<Record<string, [string, string, string]>> = {
	"0000000000000001": [
		"75a48a19d4cbe100644e8ac1397eea747a2d33ab",
		"392514c9dd4165d4709456062c78e04e16e68718515951333bdb8b26caa3053c",
		"6f76f324230cefda1d3f65309a0badb36efce9528ada64967d71e4e9d74c4aa37fe7650f931ab86ddccc2d38962d720ee626a20feb311b485a92e3bb0796df28"
	],
	"00000000023523ec": [
		"278c02e53610f84c40bd9135acd4101012410a14",
		"4eed729864525d771326c6049bc885629fb8813ebb417e5704df02358793f056",
		"b3381250260d6a9e811ae58dfa406705e38c804c97528d5a7ed8ee533331f8c43cc3454911ad1d2761f9380170c0b180a657e3a944c796e05d09f2d1630b7505"
	],
	"00000000023523ed": [
		"b0092b21d048af209da0a1ddd498ade8a79487ed",
		"cb48f7ef5cd98f6d7bfcb31ae7458ff692a015776205de7e1abfff29d6d48a9d",
		"01713ed59e49948a4f0fffb7466baebac66362d90764a5a23df761636e1535c44b635339ec00a789b8ca45cd3d727acd6b995047547f6f68adc6f16a7436c331"
	],
	"000000000273ef07": [
		"907cd1a9116564ecb9d5d1780325f246173fe703",
		"3befb8821caef9df4e05790da0966163f4e38feee7f71fcd289c3de48d3486d9",
		"87d0cfb5d4e968d7d9041a5cf21dd7d460705784004f0244edb98004e6cf9942ace539d621c97dc0fb75f6f10d64af1f09ecae83ea7f1213c7fa187dfaf6b938"
	],
	"0000000003f940aa": [
		"25a326d31fc366244cad054976020c7b56b13d5f",
		"a4e8eabbe549adfa65408945a9282cb93f394f06c0d4f122260963641bc3abe2",
		"129baa738cfa1565a24297237bce282671ff6e261754eb7011e1e75bd2555b326313142a1f9fe2f31d9ce6cc95d3b16a0dee56f2492f2f76885702d98bfadc93"
	],
	"0000000027bc86aa": [
		"ab07e97e2c1278769dbcd75783aabde75ed8550a",
		"1363cc0ee3557f092e5b55ea3ddb06bcd20f063ce393ccf670059e3ca44941f8",
		"562298a02af13e7522127adee3dc6678d53669ca2b7016186968f9a9c14f51d1e7098ba91293a01b5f3bab4207a2af5ce332a45f2c2ff2b9885aa42ff61cb426"
	]
}

const mockImportKey = async (
	_format: string,
	secret: ArrayBuffer,
	{ hash }: { hash: string }
) => [secret, hash]

const mockSign = async (
	algorithm: string,
	key: [ArrayBuffer, string],
	data: ArrayBuffer
) => {
	const dataHex = Buffer.from(data).toString("hex").toLowerCase()
	const knownHMAC = knownHMACValues[dataHex]
	const index = key[1] === "SHA-1" ? 0 : key[1] === "SHA-256" ? 1 : 2
	if (algorithm === "HMAC" && key[0] === testSecrets[index] && knownHMAC) {
		return Buffer.from(knownHMAC[index], "hex")
	} else {
		throw new Error("totp.spec.ts mock not implemented")
	}
}

beforeAll(() => {
	global.window = global.window ?? {} as any
	if (!(global.window.crypto && global.window.crypto.subtle)) {
		(global.window as any).crypto = {
			subtle: {
				importKey: jest.fn().mockImplementation(mockImportKey),
				sign: jest.fn().mockImplementation(mockSign),
			}
		}
	}
})

/**
 * TOTP Tests
 */

it.each([
	[new Date("1970-01-01T00:00:59Z"), "SHA1",   "94287082"] as const,
	[new Date("1970-01-01T00:00:59Z"), "SHA256", "46119246"] as const,
	[new Date("1970-01-01T00:00:59Z"), "SHA512", "90693936"] as const,
	[new Date("2005-03-18T01:58:29Z"), "SHA1",   "07081804"] as const,
	[new Date("2005-03-18T01:58:29Z"), "SHA256", "68084774"] as const,
	[new Date("2005-03-18T01:58:29Z"), "SHA512", "25091201"] as const,
	[new Date("2005-03-18T01:58:31Z"), "SHA1",   "14050471"] as const,
	[new Date("2005-03-18T01:58:31Z"), "SHA256", "67062674"] as const,
	[new Date("2005-03-18T01:58:31Z"), "SHA512", "99943326"] as const,
	[new Date("2009-02-13T23:31:30Z"), "SHA1",   "89005924"] as const,
	[new Date("2009-02-13T23:31:30Z"), "SHA256", "91819424"] as const,
	[new Date("2009-02-13T23:31:30Z"), "SHA512", "93441116"] as const,
	[new Date("2033-05-18T03:33:20Z"), "SHA1",   "69279037"] as const,
	[new Date("2033-05-18T03:33:20Z"), "SHA256", "90698825"] as const,
	[new Date("2033-05-18T03:33:20Z"), "SHA512", "38618901"] as const,
	[new Date("2603-10-11T11:33:20Z"), "SHA1",   "65353130"] as const,
	[new Date("2603-10-11T11:33:20Z"), "SHA256", "77737706"] as const,
	[new Date("2603-10-11T11:33:20Z"), "SHA512", "47863826"] as const,
])("generates correct totp values", async (date, algorithm, totp) => {
	await expect(generate({
		secret: testSecrets[({ "SHA1": 0, "SHA256": 1, "SHA512": 2 })[algorithm]],
		algorithm,
		digits: 8,
		period: 30,
	}, date)).resolves.toEqual(totp)
})
