import { generate, importSecret } from './hotp'

/**
 * WebCrypto Mocks
 */

const secret = new TextEncoder().encode("12345678901234567890")

const mockImportKey = async (_format: string, secret: ArrayBuffer) => secret

const knownHMACValues: Partial<Record<string, string>> = {
  "0000000000000000": "cc93cf18508d94934c64b65d8ba7667fb7cde4b0",
  "0000000000000001": "75a48a19d4cbe100644e8ac1397eea747a2d33ab",
  "0000000000000002": "0bacb7fa082fef30782211938bc1c5e70416ff44",
  "0000000000000003": "66c28227d03a2d5529262ff016a1e6ef76557ece",
  "0000000000000004": "a904c900a64b35909874b33e61c5938a8e15ed1c",
  "0000000000000005": "a37e783d7b7233c083d4f62926c7a25f238d0316",
  "0000000000000006": "bc9cd28561042c83f219324d3c607256c03272ae",
  "0000000000000007": "a4fb960c0bc06e1eabb804e5b397cdc4b45596fa",
  "0000000000000008": "1b3c89f65e6c9e883012052823443f048b4332db",
  "0000000000000009": "1637409809a679dc698207310c8c7fc07290d9e5",
}

const mockSign = async (
	algorithm: string,
	key: ArrayBuffer,
	data: ArrayBuffer
) => {
	const dataHex = Buffer.from(data).toString("hex")
	const knownHMAC = knownHMACValues[dataHex]
  if (algorithm == "HMAC" && key == secret && knownHMAC) {
    return Buffer.from(knownHMAC, "hex")
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
 * HOTP Tests
 */

it.each([
  [0, "755224"],
  [1, "287082"],
  [2, "359152"],
  [3, "969429"],
  [4, "338314"],
  [5, "254676"],
  [6, "287922"],
  [7, "162583"],
  [8, "399871"],
  [9, "520489"],
])("generates appropriate hotp values", async (counter, hotp) => {
  await expect(generate({
    secret: await importSecret({ secret, algorithm: "SHA-1" }),
    digits: 6,
    counter,
  })).resolves.toEqual(hotp)
})
