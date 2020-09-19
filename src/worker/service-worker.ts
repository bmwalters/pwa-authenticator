import { math } from "../foo-module"

self.addEventListener("install", (event) => {
	console.log("Inside the install handler:", event)
	console.log("Here's math", math(1, 0))
})

self.addEventListener("activate", (event) => {
	console.log("Inside the activate handler:", event)
	console.log("Here's math", math(1, 0))
})

self.addEventListener("fetch", (event) => {
	console.log("Inside the fetch handler:", event)
	console.log("Here's math", math(1, 0))
})
