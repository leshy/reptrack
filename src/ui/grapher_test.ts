import { KeypointGrapher } from "./grapher.ts"
import { SvgWindow } from "./wm.ts"
import { History } from "../binary/history.ts"
import { Pose } from "../binary/pose.ts"
import {
    assert,
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts"

// Mock DOM classes
class MockElement {
    tagName: string
    className: string = ""
    style: Record<string, string> = {}
    innerText: string = ""
    children: MockElement[] = []
    attributes: Map<string, string> = new Map()
    eventListeners: Map<string, ((event: WheelEvent | Event) => void)[]> =
        new Map()

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

    getBoundingClientRect() {
        return {
            left: 0,
            top: 0,
            width: 255,
            height: 255,
        }
    }

    addEventListener(
        event: string,
        handler: (event: WheelEvent | Event) => void,
        _options?: { passive?: boolean },
    ) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event)!.push(handler)
    }

    triggerEvent(event: string, data: Partial<WheelEvent>) {
        const handlers = this.eventListeners.get(event) || []
        for (const handler of handlers) {
            handler(data as WheelEvent)
        }
    }
}

// Mock console for testing warnings/errors
const originalConsole = console
let mockConsoleMessages: { level: string; message: string }[] = []
const mockConsole = {
    log: (message: string) =>
        mockConsoleMessages.push({ level: "log", message }),
    warn: (message: string) =>
        mockConsoleMessages.push({ level: "warn", message }),
    error: (message: string) =>
        mockConsoleMessages.push({ level: "error", message }),
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

// Create a fixture with sample pose data
function createTestHistory(): History {
    const history = new History()

    // Add some poses with predictable data
    for (let i = 0; i < 10; i++) {
        const pose = new Pose()
        pose.timestamp = 1000 + i * 100 // 1000, 1100, 1200, etc.
        pose.score = 0.9

        // Set keypoints for testing
        pose.setKeypointByName("nose", [50 + i * 5, 60 + i * 3, 0.95])
        pose.setKeypointByName("left_eye", [45 + i * 4, 40 + i * 2, 0.93])
        pose.setKeypointByName("right_eye", [55 + i * 3, 40 + i * 2, 0.94])

        history.push(pose)
    }

    return history
}

// Replace globals with mocks before tests
function setupMocks() {
    globalThis.document = mockDocument as unknown as Document
    globalThis.console = mockConsole as unknown as Console
    mockConsoleMessages = []
}

// Restore the original console after tests
function tearDownMocks() {
    globalThis.console = originalConsole
}

Deno.test("KeypointGrapher initialization", () => {
    setupMocks()

    const history = createTestHistory()
    const grapher = new KeypointGrapher(history, {
        title: "Test Grapher",
    })

    assert(grapher, "Grapher should be created")

    tearDownMocks()
})

Deno.test("KeypointGrapher drawKeypointGraph", () => {
    setupMocks()

    const history = createTestHistory()
    const grapher = new KeypointGrapher(history)
    const svgWindow = new SvgWindow("Test Window")

    const path = grapher.drawKeypointGraph(svgWindow, "nose", "x")

    assertExists(path, "Path should be created")
    assertEquals(path.getAttribute("fill"), "none", "Path fill should be none")
    assert(path.getAttribute("stroke"), "Path stroke should be set")
    assertEquals(
        path.getAttribute("stroke-width"),
        "0.5",
        "Path stroke width should be correct",
    )

    // SVG should have a path element
    const svgElement = svgWindow.svg as unknown as MockElement
    assertEquals(svgElement.children.length, 1, "SVG should have one child")
    assert(
        svgElement.children.includes(path as unknown as MockElement),
        "SVG should contain the path",
    )

    tearDownMocks()
})

Deno.test("KeypointGrapher zoom interaction", () => {
    setupMocks()

    const history = createTestHistory()
    const grapher = new KeypointGrapher(history, {
        zoomFactor: 0.2, // 20% zoom per scroll
    })
    const svgWindow = new SvgWindow("Test Window")

    // Draw a graph to initialize everything
    grapher.drawKeypointGraph(svgWindow, "nose", "x")

    // Get the SVG element
    const svgElement = svgWindow.svg as unknown as MockElement

    // Simulate a zoom-in event (negative deltaY)
    svgElement.triggerEvent("wheel", {
        preventDefault: () => {},
        deltaY: -100, // Zoom in
        clientX: 127.5, // Center of the graph
        clientY: 127.5,
    })

    // Simulate a zoom-out event (positive deltaY)
    svgElement.triggerEvent("wheel", {
        preventDefault: () => {},
        deltaY: 100, // Zoom out
        clientX: 127.5, // Center of the graph
        clientY: 127.5,
    })

    // Note: We can't really verify the zoom effect directly since the graph data
    // is managed inside the class with private methods and WeakMaps
    // But we can verify that the event listener was attached and doesn't throw errors

    tearDownMocks()
})

Deno.test("KeypointGrapher annotations", () => {
    setupMocks()

    const history = createTestHistory()
    const grapher = new KeypointGrapher(history)
    const svgWindow = new SvgWindow("Test Window")

    // Add a vertical line annotation
    const lineId = grapher.addAnnotation(svgWindow, {
        type: "line",
        orientation: "vertical",
        value: 1200, // timestamp
        color: "#ff0000",
        label: "Test Line",
    })

    assert(lineId, "Line annotation should have an ID")

    // SVG should have line elements
    const svgElement = svgWindow.svg as unknown as MockElement
    assert(
        svgElement.children.length > 0,
        "SVG should have annotation elements",
    )

    // Add a region annotation
    const regionId = grapher.addAnnotation(svgWindow, {
        type: "region",
        value: 1100, // start timestamp
        endValue: 1300, // end timestamp
        color: "#00ff00",
        label: "Test Region",
        opacity: 0.5,
    })

    assert(regionId, "Region annotation should have an ID")
    assert(
        svgElement.children.length > 2,
        "SVG should have more elements after adding region",
    )

    // Update an annotation
    const updated = grapher.updateAnnotation(svgWindow, lineId, {
        color: "#0000ff",
        label: "Updated Line",
    })

    assert(updated, "Annotation should be updated")

    // Remove an annotation
    const removed = grapher.removeAnnotation(svgWindow, regionId)

    assert(removed, "Annotation should be removed")

    // Clear all annotations
    grapher.clearAnnotations(svgWindow)

    // Attempt to add an invalid annotation
    grapher.addAnnotation(svgWindow, {
        type: "region",
        value: 1400,
        // Missing endValue which is required for regions
        color: "#ff00ff",
    })

    assertEquals(
        mockConsoleMessages.length,
        1,
        "Console error should be logged",
    )
    assertEquals(
        mockConsoleMessages[0].level,
        "error",
        "Console error should be of error level",
    )

    tearDownMocks()
})

Deno.test("KeypointGrapher set start and end", () => {
    setupMocks()

    const history = createTestHistory()
    const grapher = new KeypointGrapher(history)
    const svgWindow = new SvgWindow("Test Window")

    // Draw a graph to initialize
    grapher.drawKeypointGraph(svgWindow, "nose", "x")

    // Update view range
    grapher.setStart(2)
    grapher.setEnd(7)

    // Window title should be updated to reflect the range
    assertEquals(
        svgWindow.title,
        " [2-7]",
        "Window title should show the range",
    )

    tearDownMocks()
})
