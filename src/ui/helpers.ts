export function colorInterpolator(
    endColor: [number, number, number],
    startColor: [number, number, number],
): (score: number) => string {
    return function (score: number): string {
        // Clamp the score between 0 and 1
        const clampedScore = Math.max(0, Math.min(1, score))

        // Interpolate each component
        const r = Math.round(
            startColor[0] + (endColor[0] - startColor[0]) * clampedScore,
        )
        const g = Math.round(
            startColor[1] + (endColor[1] - startColor[1]) * clampedScore,
        )
        const b = Math.round(
            startColor[2] + (endColor[2] - startColor[2]) * clampedScore,
        )

        // Return the RGB string
        return `rgb(${r}, ${g}, ${b})`
    }
}

export function quickDisplay(event: MouseEvent, data: string) {
    // Remove any existing display
    removeQuickDisplay()

    // Create floating display
    const display = document.createElement("div")
    display.className = "quick-display"
    display.innerHTML = data.replace(/\n/g, "<br>")
    document.body.appendChild(display)

    // Position the display
    display.style.left = `${event.clientX + 50}px`
    display.style.top = `${event.clientY + 50}px`

    // Create full-screen overlay SVG if it doesn't exist
    let overlaySvg = document.getElementById("overlay-svg") as
        | SVGSVGElement
        | null
    if (!overlaySvg) {
        overlaySvg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg",
        )
        overlaySvg.id = "overlay-svg"
        overlaySvg.style.position = "fixed"
        overlaySvg.style.top = "0"
        overlaySvg.style.left = "0"
        overlaySvg.style.width = "100%"
        overlaySvg.style.height = "100%"
        overlaySvg.style.pointerEvents = "none"
        document.body.appendChild(overlaySvg)
    }

    // Draw line in the overlay SVG
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
    line.setAttribute("x1", event.clientX.toString())
    line.setAttribute("y1", event.clientY.toString())
    line.setAttribute("x2", (event.clientX + 50).toString())
    line.setAttribute("y2", (event.clientY + 50).toString())
    line.setAttribute("stroke", "white")
    line.setAttribute("stroke-width", "2")
    line.id = "quick-display-line"
    overlaySvg.appendChild(line)

    // Set up event listener to remove display
    document.addEventListener("mousemove", removeQuickDisplay)
}

function removeQuickDisplay() {
    const display = document.querySelector(".quick-display")
    const line = document.getElementById("quick-display-line")
    if (display) display.remove()
    if (line) line.remove()
    document.removeEventListener("mousemove", removeQuickDisplay)
}

export function getRandomColor(str: string | number): string {
    str = String(str)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash % 360)
    const saturation = (hash % 31) + 70 // 70-100%
    const lightness = (hash % 31) + 60 // 60-90%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
export function getRangedColor(range: number, value: number): string {
    // Ensure value is within the range
    const clampedValue = value % range

    // Calculate hue (0 to 360 degrees)
    const hue = (clampedValue / range) * 360

    // Return the HSL color string
    return `hsl(${Math.round(hue)}, 60%, 50%)`
}
