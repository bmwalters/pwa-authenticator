import * as otpauth from "../otp/uri"

self.addEventListener("install", (event) => {
	console.log("Inside the install handler:", event)
	console.log("here's an otpauth token", otpauth.parse("otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example"))
})

self.addEventListener("activate", (event) => {
	console.log("Inside the activate handler:", event)
	console.log("here's an otpauth token", otpauth.parse("otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example"))
})

self.addEventListener("fetch", (event) => {
	console.log("Inside the fetch handler:", event)
	console.log("here's an otpauth token", otpauth.parse("otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example"))
})
