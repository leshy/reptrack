import { EventEmitter } from "npm:eventemitter3"

export class Window extends EventEmitter {
    public element: HTMLDivElement
    protected titleElement?: HTMLDivElement
    protected contentElement: HTMLDivElement
    protected subWindows: Window[] = []

    constructor(title: string = "") {
        super()
        this.element = document.createElement("div")
        this.element.className = "window"

        if (title) {
            this.titleElement = document.createElement("div")
            this.titleElement.className = "window-title"
            this.titleElement.innerText = title
            this.element.appendChild(this.titleElement)
        }

        this.contentElement = document.createElement("div")
        this.contentElement.className = "window-content"
        this.contentElement.style.display = "flex"
        this.contentElement.style.flexWrap = "wrap"
        this.element.appendChild(this.contentElement)
    }

    get title(): string {
        return this.titleElement ? this.titleElement.innerText : ""
    }

    set title(value: string) {
        if (this.titleElement) {
            this.titleElement.innerText = value
        }
    }

    addWindow<W extends Window>(window: W): W {
        this.subWindows.push(window)
        this.contentElement.appendChild(window.element)
        return window
    }

    removeWindow(window: Window) {
        const index = this.subWindows.indexOf(window)
        if (index !== -1) {
            this.subWindows.splice(index, 1)
            this.contentElement.removeChild(window.element)
        }
    }

    clearWindows() {
        this.subWindows.forEach((subWin) =>
            this.contentElement.removeChild(subWin.element)
        )
        this.subWindows = []
    }
}

type SvgWindowConfig = {
    preserveRatio: boolean
    viewbox?: string
}

export class SvgWindow extends Window {
    private svgElement: SVGSVGElement

    static defaultConfig: SvgWindowConfig = {
        preserveRatio: true,
    }

    constructor(
        title: string = "",
        config: Partial<SvgWindowConfig> = {},
    ) {
        super(title)

        const fullConfig = {
            ...SvgWindow.defaultConfig,
            ...config,
        }

        this.svgElement = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg",
        )

        if (fullConfig.viewbox) {
            // .. set viewbox
        }
        if (!fullConfig.preserveRatio) {
            this.svgElement.setAttribute("preserveAspectRatio", "none")
        }

        this.svgElement.style.width = "100%"
        this.svgElement.style.height = "100%"
        this.svgElement.style.position = "absolute"
        this.svgElement.style.top = "0"
        this.svgElement.style.left = "0"

        this.contentElement.appendChild(this.svgElement)
    }

    get svg(): SVGSVGElement {
        return this.svgElement
    }
}
