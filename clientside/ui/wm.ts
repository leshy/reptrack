// Base Window class
export class Window {
    public element: HTMLDivElement
    protected titleElement?: HTMLDivElement
    protected contentElement: HTMLDivElement
    protected subWindows: Window[] = []

    constructor(title: string = "") {
        // Create the main window element
        this.element = document.createElement("div")
        this.element.className = "window"

        // Only create a title element if a title is provided
        if (title) {
            this.titleElement = document.createElement("div")
            this.titleElement.className = "window-title"
            this.titleElement.innerText = title
            this.element.appendChild(this.titleElement)
        }

        // Create the content area
        this.contentElement = document.createElement("div")
        this.contentElement.className = "window-content"
        this.contentElement.style.display = "flex"
        this.contentElement.style.flexWrap = "wrap"
        this.element.appendChild(this.contentElement)
    }

    // Getter for title
    get title(): string {
        return this.titleElement ? this.titleElement.innerText : ""
    }

    // Setter for title
    set title(value: string) {
        if (this.titleElement) {
            this.titleElement.innerText = value
        }
    }

    // Append the window to a parent element
    appendTo(parent: HTMLElement) {
        parent.appendChild(this.element)
    }

    // Add a sub-window
    addWindow<W extends Window>(window: W): W {
        this.subWindows.push(window)
        window.appendTo(this.contentElement)
        return window
    }

    // Remove a sub-window
    removeWindow(window: Window) {
        const index = this.subWindows.indexOf(window)
        if (index !== -1) {
            this.subWindows.splice(index, 1)
            this.contentElement.removeChild(window.element)
        }
    }

    // Clear all sub-windows
    clearWindows() {
        this.subWindows.forEach((subWin) =>
            this.contentElement.removeChild(subWin.element)
        )
        this.subWindows = []
    }
}

// SvgWindow subclass
export class SvgWindow extends Window {
    private svgElement: SVGSVGElement

    constructor(
        title: string = "",
        viewbox: string = "-1 -1 2 2",
        preserveRatio: boolean = true,
    ) {
        // Call the base Window constructor
        super(title)

        // Create the SVG element
        this.svgElement = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg",
        )
        this.svgElement.setAttribute("viewBox", viewbox)
        if (!preserveRatio) {
            this.svgElement.setAttribute("preserveAspectRatio", "none")
        }
        this.svgElement.style.width = "100%"
        this.svgElement.style.height = "100%"
        this.svgElement.style.position = "absolute"
        this.svgElement.style.top = "0"
        this.svgElement.style.left = "0"

        // Append the SVG element to the content area
        this.contentElement.appendChild(this.svgElement)
    }

    // Getter for the SVG element
    get svg(): SVGSVGElement {
        return this.svgElement
    }
}
