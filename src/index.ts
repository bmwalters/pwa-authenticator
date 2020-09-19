// TODO: lint with lighthouse

import { math } from "./foo-module.js"

const main = async () => {
	await navigator.serviceWorker.register("./service-worker.js")

	console.log("Here's math", math(1, 0))
}

main().catch(console.error)
