import * as hotp from "./otp/hotp.js"
import * as totp from "./otp/totp.js"
import * as steamguard from "./otp/steamguard.js"
import * as otpauth from "./otp/uri.js"
import {
	listTokens,
	addTokenAndBackup,
	initializeBackup,
	BackupNotInitializedError,
} from "./store.js"

let inDragDrop = false

const renderTokens = async () => {
	const tokens = await listTokens()
	const now = new Date()
	const generated = await Promise.all(tokens.map((token) => {
		switch (token.type) {
		case "totp":
			return totp.generate(token, now)
		case "hotp":
			return hotp.generate(token)
		case "steamguard":
			return steamguard.generate(token.secret, now)
		}
	}))

	const tokenList = document.querySelector("#token-list-page .token-list")!
	const tokenElements = tokenList.children
	const tokenTemplate = document.querySelector<HTMLTemplateElement>("#token-template")!

	if (tokenElements.length > tokens.length) {
		Array.from(tokenElements)
			.slice(tokens.length - tokenElements.length)
			.forEach((element) => element.remove())
	}

	if (tokens.length > tokenElements.length) {
		for (let i = tokenElements.length; i < tokens.length; i++) {
			const token = tokenTemplate.content.cloneNode(true)
			tokenList.appendChild(token)
		}
	}

	tokens.forEach((token, i) => {
		const otp = generated[i]!
		const element = tokenList.children[i]!

		element.querySelector<HTMLElement>(".issuer")!.innerText =
			token.type === "steamguard" ? "Steam" : token.issuer || ""

		element.querySelector<HTMLElement>(".account")!.innerText =
			token.accountName

		const drag = element.querySelector<HTMLElement>(".drag-handle")!
		if (inDragDrop) drag.removeAttribute("hidden")
		else drag.setAttribute("hidden", "")
		// TODO: Attach drag/drop event listeners to new elements.

		const increment = element.querySelector<HTMLElement>(".increment-counter")!
		if (token.type === "hotp") increment.removeAttribute("hidden")
		else increment.setAttribute("hidden", "")

		element.querySelector<HTMLElement>(".token-token")!.innerText = otp
	})
}

let time = 29 - Math.floor((Date.now() / 1000) % 30)

const updateProgressRing = () => {
	const progressRing = document.querySelector<HTMLElement>("#progress-ring")!
	progressRing.classList.add("animating")

	time -= 1
	if (time < 0) {
		renderTokens().catch(console.error)
		time = 30
		progressRing.classList.remove("animating")
	}

	const ring = document.querySelector<SVGCircleElement>(
		"#progress-ring circle.ring",
	)!
	const circumference = Number(
		window
			.getComputedStyle(ring)
			.strokeDasharray.split(", ")[0]
			.replace("px", ""),
	)
	ring.style.strokeDashoffset = `${(1 - time / 30) * circumference}px`
	setTimeout(updateProgressRing, 1000)
}

// TODO: Implement drag and drop on mobile
const setupDragAndDrop = () => {
	inDragDrop = true
	// TODO: Implement leaving drag and drop mode & persist ordering

	const isBefore = (el1: HTMLElement, el2: HTMLElement): boolean => {
		if (el2.parentNode === el1.parentNode)
			for (let cur = el1.previousSibling; cur; cur = cur.previousSibling)
				if (cur === el2) return true

		return false
	}

	const items = document.querySelectorAll<HTMLElement>(".token-list > .token")

	let selected: HTMLElement | undefined

	items.forEach((item) => {
		item.addEventListener(
			"dragstart",
			(event) => {
				event.dataTransfer!.effectAllowed = "move"
				event.dataTransfer!.setData("text/plain", "")
				selected = item
			},
			false,
		)

		item.addEventListener("dragend", () => {
			item.setAttribute("draggable", "false")
			selected = undefined
		})

		item.addEventListener("dragover", (event) => {
			if (!selected) return

			const target = event.currentTarget as HTMLElement

			if (isBefore(selected, target)) {
				target.parentNode!.insertBefore(selected, target)
			} else {
				target.parentNode!.insertBefore(selected, target.nextSibling)
			}

			event.preventDefault()
		})

		item.addEventListener("dragenter", (event) => {
			if (selected) event.preventDefault()
		})

		const handle = item.querySelector<HTMLElement>(".drag-handle")
		handle?.removeAttribute("hidden")

		handle?.addEventListener("mousedown", () => {
			item.setAttribute("draggable", "true")
		})

		handle?.addEventListener("mouseup", () => {
			item.setAttribute("draggable", "false")
		})
	})
}

// routes are defined in index.html.
declare const routes: Record<"" | "add", string>

/** The name:value pairs from inputs in `#add-token-page form`. */
interface AddTokenFormData {
	account: string
	issuer?: string
	secret: string
	algorithm: "totp" | "hotp"
	digits: "6" | "7" | "8"
	["hash-algorithm"]: "SHA1" | "SHA256" | "SHA512"
}

const addTokenFromForm = async (form: AddTokenFormData) => {
	// convert form data to otpauth uri
	const encodedAccount = encodeURIComponent(form.account)
	const label = form.issuer ? `${encodeURIComponent(form.issuer)}:${encodedAccount}` : encodedAccount
	const uri = `otpauth://${form.algorithm}/${label}?secret=${form.secret}&algorithm=${form["hash-algorithm"]}&digits=${form.digits}`

	// parse otpauth uri to token model
	const token = otpauth.parse(uri)
	const importedToken = { ...token, secret: await hotp.importSecret(token) }

	// add token to store
	await addTokenAndBackup(importedToken, token.secret)
}

const exportBackupPrivateKey = async (privateKey: string) => {
	const keyFile = new File(
		[privateKey],
		"authenticator-backup-private-key.pem",
		{ type: "application/x-pem-file",
	})
	const shareData = { title: "Backup Private Key", files: [keyFile] }

	if (navigator.share) {
		await navigator.share(shareData)
	} else {
		const objectURL = URL.createObjectURL(keyFile)
		const a = document.createElement("a")
		a.href = objectURL
		a.download = keyFile.name
		document.body.appendChild(a)
		a.click()
		a.remove()
		URL.revokeObjectURL(objectURL)
	}
}

const initBackup = async () => {
	const privateKey = await initializeBackup()
	try {
		await exportBackupPrivateKey(privateKey)
	} catch (error) {
		// If an error occurred, the user did not save their private key.
		// TODO: Delete backup key from store; the user can't use it
		//       and we want to get BackupNotInitializedError again.
		throw error
	}
}

const main = async () => {
	/* PWA initialization */
	await navigator.serviceWorker.register("./service-worker.js")

	/* hash router configuration */
	const onHashChange = () => {
		let hash = window.location.hash.substring(2)
		if (!routes.hasOwnProperty(hash))
			hash = ""

		Object.entries(routes).forEach(([route, selector]) => {
			document.querySelector<HTMLElement>(selector)!.hidden = hash !== route
		})
	}
	window.addEventListener("hashchange", onHashChange)
	// initial routing based on window.location.hash is performed in index.html.

	const navigate = (route: keyof typeof routes) => {
		if (route === "") {
			history.pushState(undefined, "", ".")
			onHashChange()
		} else {
			window.location.hash = "/" + route
		}
	}

	/* 'Token List' page */
	renderTokens().catch(console.error)
	setTimeout(updateProgressRing, 1000)

	document.querySelector<HTMLButtonElement>("#token-list-page .button-add-token")
		?.addEventListener("click", () => navigate("add"))

	document.querySelector<HTMLButtonElement>("#token-list-page .button-edit")
		?.addEventListener("click", () => setupDragAndDrop())

	/* 'Add Token' page */
	const addTokenForm = document.querySelector<HTMLFormElement>("#add-token-page form")!
	const initializeBackupMessage = document.querySelector<HTMLElement>(
		"#add-token-page .initialize-backup-message"
	)

	addTokenForm.addEventListener("submit", (event) => {
		event.preventDefault()

		const formData = new FormData(addTokenForm)
		const tokenFormData = Array.from(formData.entries())
			.reduce((acc, [key, value]) => {
				(acc as any)[key] = value
				return acc
			}, {} as AddTokenFormData)

		addTokenFromForm(tokenFormData)
			.then(() => { navigate(""); return renderTokens() })
			.catch((error) => {
				if (error instanceof BackupNotInitializedError) {
					initializeBackupMessage.removeAttribute("hidden")
				} else {
					console.error(error)
				}
			})
	})

	document.querySelector<HTMLButtonElement>("#add-token-page .button-cancel")
		?.addEventListener("click", () => { addTokenForm.reset(); navigate("") })

	document.querySelector<HTMLButtonElement>("#add-token-done")
		?.addEventListener("click", () => addTokenForm.requestSubmit())

	document.querySelector<HTMLButtonElement>("#initialize-backup")
		?.addEventListener("click", () => {
			initBackup()
				.then(() => initializeBackupMessage.setAttribute("hidden", ""))
				.catch(console.error)
		})

	// TODO: "Info" page and "Export Backup Data" button
}

// TODO: Display errors to the user as well as logging.
main().catch(console.error)
