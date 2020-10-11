import { generate } from './steamguard'

/**
 * WebCrypto Mocks
 */

const mockImportKey = async (
	_format: string,
	secret: ArrayBuffer,
	{ hash }: { hash: string }
) => [secret, hash]

const mockSign = async (
	algorithm: string,
	key: [ArrayBuffer, "SHA-1" | "SHA-256" | "SHA-512"],
	data: ArrayBuffer
) => {
	const keyHex = Buffer.from(key[0]).toString("hex").toLowerCase()
	const dataHex = Buffer.from(data).toString("hex").toLowerCase()

	if (
		algorithm === "HMAC"
			&& key[1] === "SHA-1"
			&& keyHex == "7273a0bff29da4ba0fe8d6e1d063245e43d700b4"
			&& dataHex === "00000000032f0c97"
	) {
		return Buffer.from("4dfe314e717f6012b050216e0e9b39e684896950", "hex")
  } else {
    throw new Error("hotp.spec.ts mock not implemented")
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
 * Steamguard OTP Tests
 */

it.each([
	["7273a0bff29da4ba0fe8d6e1d063245e43d700b4", new Date("2020-10-11T21:31:30.502Z"), "8DCD5"]
])("generates correct steamguard otp values", async (secretStr, date, otp) => {
	const secret = Buffer.from(secretStr, "hex")
	await expect(generate({ secret }, date)).resolves.toEqual(otp)
})
