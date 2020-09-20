// TODO: lint with lighthouse

import { math } from "./foo-module.js"

let time = 30

const updateProgressRing = () => {
	const progressRing = document.querySelector<HTMLElement>("#progress-ring")!
	progressRing.classList.add("animating")

	time -= 1
	if (time < 0) {
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

		handle?.addEventListener("mousedown", () => {
			item.setAttribute("draggable", "true")
		})

		handle?.addEventListener("mouseup", () => {
			item.setAttribute("draggable", "false")
		})
	})
}

const main = async () => {
	await navigator.serviceWorker.register("./service-worker.js")

	console.log("Here's math", math(1, 0))

	setTimeout(updateProgressRing, 1000)

	setupDragAndDrop()
}

main().catch(console.error)
