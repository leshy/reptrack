import { SvgWindow, Window } from "./wm.ts"
import {
    assert,
    assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts"

// Mock the DOM
class MockElement {
    tagName: string
    className: string = ""
    style: Record<string, string> = {}
    innerText: string = ""
    children: MockElement[] = []
    attributes: Map<string, string> = new Map()

    constructor(tagName: string) {
        this.tagName = tagName
    }

    appendChild(child: MockElement) {
        this.children.push(child)
        return child
    }

    removeChild(child: MockElement) {
        const index = this.children.indexOf(child)
        if (index !== -1) {
            this.children.splice(index, 1)
        }
    }

    setAttribute(name: string, value: string) {
        this.attributes.set(name, value)
    }

    getAttribute(name: string) {
        return this.attributes.get(name)
    }
}

// Mock document
const mockDocument = {
    createElement(tag: string): MockElement {
        return new MockElement(tag)
    },
    createElementNS(_ns: string, tag: string): MockElement {
        return new MockElement(tag)
    },
}

// Replace global document with our mock
globalThis.document = mockDocument as unknown as Document

// Tests for Window class
Deno.test("Window constructor with title", () => {
    const title = "Test Window"
    const win = new Window(title)

    assert(win.element, "Window element should be created")
    assertEquals(
        win.element.className,
        "window",
        "Window should have correct class",
    )
    assertEquals(win.title, title, "Window title should match")
})

Deno.test("Window constructor without title", () => {
    const win = new Window()

    assert(win.element, "Window element should be created")
    assertEquals(
        win.element.className,
        "window",
        "Window should have correct class",
    )
    assertEquals(win.title, "", "Window title should be empty")
})

Deno.test("Window title setter", () => {
    const win = new Window("Initial Title")
    const newTitle = "Updated Title"

    win.title = newTitle
    assertEquals(win.title, newTitle, "Window title should be updated")
})

Deno.test("Window add and remove subwindow", () => {
    const parentWin = new Window("Parent")
    const childWin = new Window("Child")

    // Add child window
    parentWin.addWindow(childWin)

    const contentEl = parentWin.element.children[1] // content element is the second child
    assertEquals(contentEl.children.length, 1, "Child window should be added")

    // Remove child window
    parentWin.removeWindow(childWin)
    assertEquals(contentEl.children.length, 0, "Child window should be removed")
})

Deno.test("Window clearWindows", () => {
    const parentWin = new Window("Parent")
    parentWin.addWindow(new Window("Child 1"))
    parentWin.addWindow(new Window("Child 2"))
    parentWin.addWindow(new Window("Child 3"))

    const contentEl = parentWin.element.children[1] // content element is the second child
    assertEquals(contentEl.children.length, 3, "Should have 3 child windows")

    parentWin.clearWindows()
    assertEquals(
        contentEl.children.length,
        0,
        "All child windows should be removed",
    )
})

// Tests for SvgWindow class
Deno.test("SvgWindow constructor", () => {
    const title = "SVG Window"
    const svgWin = new SvgWindow(title)

    assert(svgWin.element, "SvgWindow element should be created")
    assertEquals(svgWin.title, title, "SvgWindow title should match")

    // Check SVG element creation
    const contentEl = svgWin.element.children[1] // content element is the second child
    assertEquals(
        contentEl.children.length,
        1,
        "SVG element should be added to content",
    )

    const svgEl = contentEl.children[0]
    assertEquals(svgEl.tagName, "svg", "SVG element should be created")
    // No viewBox in new implementation
    assertEquals(
        svgEl.getAttribute("viewBox"),
        undefined,
        "No viewBox should be set by default",
    )
})

Deno.test("SvgWindow custom config", () => {
    const preserveRatio = false

    const svgWin = new SvgWindow("Custom SVG", {
        preserveRatio,
    })

    const contentEl = svgWin.element.children[1]
    const svgEl = contentEl.children[0]

    // ViewBox is no longer part of the config
    assertEquals(
        svgEl.getAttribute("viewBox"),
        undefined,
        "No viewBox should be set",
    )
    assertEquals(
        svgEl.getAttribute("preserveAspectRatio"),
        "none",
        "preserveAspectRatio should be none",
    )
})

Deno.test("SvgWindow svg getter", () => {
    const svgWin = new SvgWindow("SVG Window")
    const svg = svgWin.svg

    assert(svg, "SVG element should be accessible via getter")
    assertEquals(svg.tagName, "svg", "Should return SVG element")
})
