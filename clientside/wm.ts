export type EL = HTMLElement | SVGElement
const container = document.getElementById("window-container")

if (!container) {
    throw new Error(
        "No WM container found. create an element with window-container id",
    )
}

export function createWindow(
    child: EL | EL[],
    width: string | number = "auto",
) {
    const parent = document.createElement("span")
    parent.className = "window"
    parent.style.width = String(width)

    if (Array.isArray(child)) {
        child.forEach((el) => parent.appendChild(el))
    } else {
        parent.appendChild(child)
    }
    // @ts-ignore
    container.appendChild(parent)
    return parent
}

export function createSvgWindow(viewbox: string = "-1 -1 2 2") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.style.width = "100%"
    svg.style.height = "100%"
    svg.style.position = "absolute"
    svg.style.top = "0"
    svg.style.left = "0"
    svg.style.pointerEvents = "none"
    svg.setAttribute("viewBox", viewbox)
    createWindow(svg)
    return svg
}
