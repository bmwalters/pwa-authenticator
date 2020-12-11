import * as hotp from "./otp/hotp.js"
import * as totp from "./otp/totp.js"
import * as steamguard from "./otp/steamguard.js"
import * as otpauth from "./otp/uri.js"
import { listTokens, addToken, createBackup } from "./store.js"

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
		time = 29
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
	// handle special cases of issuers
	if (form.issuer === "Steam")
		return await addSteamguardTokenFromForm(form)

	// convert form data to otpauth uri
	const encodedAccount = encodeURIComponent(form.account)
	const label = form.issuer ? `${encodeURIComponent(form.issuer)}:${encodedAccount}` : encodedAccount
	const uri = `otpauth://${form.algorithm}/${label}?secret=${form.secret}&algorithm=${form["hash-algorithm"]}&digits=${form.digits}`

	// parse otpauth uri to token model
	const token = otpauth.parse(uri)
	const importedToken = { ...token, secret: await hotp.importSecret(token) }

	// add token to store
	await addToken(importedToken)
}

const addSteamguardTokenFromForm = async (form: AddTokenFormData) => {
	await addToken({
		type: "steamguard",
		accountName: form.account,
		secret: await steamguard.importSharedSecret(form.secret),
	})
}

const exportBackup = async (backup: ArrayBuffer) => {
	const backupFile = new File([backup], "authenticator-backup.aes")
	const shareData = { title: "Authenticator Backup", files: [backupFile] }

	if (navigator.share) {
		await navigator.share(shareData)
	} else {
		const objectURL = URL.createObjectURL(backupFile)
		const a = document.createElement("a")
		a.href = objectURL
		a.download = backupFile.name
		document.body.appendChild(a)
		a.click()
		a.remove()
		URL.revokeObjectURL(objectURL)
	}
}

// routes are defined in index.html.
declare const routes: Record<"" | "add" | "info", string>

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

	document.querySelector<HTMLButtonElement>("#token-list-page .button-info")
		?.addEventListener("click", () => navigate("info"))

	/* 'Add Token' page */
	const addTokenForm = document.querySelector<HTMLFormElement>("#add-token-page form")!

	const handleAddTokenFormSubmit = () => {
		const formData = new FormData(addTokenForm)
		const tokenFormData = Array.from(formData.entries())
			.reduce((acc, [key, value]) => {
				(acc as any)[key] = value
				return acc
			}, {} as AddTokenFormData)

		addTokenFromForm(tokenFormData)
			.then(() => {
				addTokenForm.reset()
				navigate("")
				return renderTokens()
			})
			.catch(console.error)
	}

	addTokenForm.addEventListener("submit", (event) => {
		event.preventDefault()
		handleAddTokenFormSubmit()
	})

	document.querySelector<HTMLButtonElement>("#add-token-page .button-cancel")
		?.addEventListener("click", () => { addTokenForm.reset(); navigate("") })

	document.querySelector<HTMLButtonElement>("#add-token-done")
		?.addEventListener("click", () => {
			if (addTokenForm.requestSubmit) addTokenForm.requestSubmit()
			else handleAddTokenFormSubmit()
		})

	/* 'Info' page */
	const createBackupForm = document.querySelector<HTMLFormElement>("#backup-section form")!

	createBackupForm.addEventListener("submit", (event) => {
		event.preventDefault()

		const formData = new FormData(createBackupForm)
		const password = formData.get("password") as string

		createBackup(password)
			.then((backup) => exportBackup(backup))
			.then(() => { navigate("") })
			.catch(console.error)
	})

	document.querySelector<HTMLButtonElement>("#info-page .button-cancel")
		?.addEventListener("click", () => { createBackupForm.reset(); navigate("") })
}

// TODO: Display errors to the user as well as logging.
main().catch(console.error)
