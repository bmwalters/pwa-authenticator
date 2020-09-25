/*
This software is licensed under the MIT License.

Copyright (c) 2017, Christopher Jeffrey (https://github.com/chjj)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

import * as bs32 from "./base32"

// https://tools.ietf.org/html/rfc4648#section-10
const vectors = [
	["", ""],
	["f", "my======"],
	["fo", "mzxq===="],
	["foo", "mzxw6==="],
	["foob", "mzxw6yq="],
	["fooba", "mzxw6ytb"],
	["foobar", "mzxw6ytboi======"],
]

const vectorsHex = [
	["", ""],
	["f", "co======"],
	["fo", "cpng===="],
	["foo", "cpnmu==="],
	["foob", "cpnmuog="],
	["fooba", "cpnmuoj1"],
	["foobar", "cpnmuoj1e8======"],
]

describe("Base32", () => {
	it.each(vectors)("should encode and decode base32: %p: %p", (str, b32) => {
		const data = new TextEncoder().encode(str)

		expect(bs32.encode(data, true)).toEqual(b32)
		expect(bs32.encode(data, false)).toEqual(b32.replace(/=+$/, ""))
		expect(bs32.decode(b32)).toEqual(data)
		expect(bs32.decode(b32.replace(/=+$/, ""))).toEqual(data)
		expect(bs32.test(b32)).toEqual(true)
		expect(bs32.test(b32.replace(/=+$/, ""))).toEqual(true)
	})

	it.each(vectorsHex)("should encode and decode base32: %p: %p", (str, b32) => {
		const data = new TextEncoder().encode(str)

		expect(bs32.encodeHex(data, true)).toEqual(b32)
		expect(bs32.encodeHex(data, false)).toEqual(b32.replace(/=+$/, ""))
		expect(bs32.decodeHex(b32)).toEqual(data)
		expect(bs32.decodeHex(b32.replace(/=+$/, ""))).toEqual(data)
		expect(bs32.testHex(b32)).toEqual(true)
		expect(bs32.testHex(b32.replace(/=+$/, ""))).toEqual(true)
	})
})
