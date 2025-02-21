export type EL = HTMLElement | SVGElement

export function insertElement(
    child: EL | EL[],
    width: string | number = "auto",
) {
    const parent = document.createElement("div")
    parent.className = "container"
    parent.style.width = String(width)

    if (Array.isArray(child)) {
        child.forEach((el) => parent.appendChild(el))
    } else {
        parent.appendChild(child)
    }

    document.body.appendChild(parent)
    return parent
}
