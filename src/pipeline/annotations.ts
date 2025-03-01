import _webfft from "npm:webfft"
import "npm:@tensorflow/tfjs-backend-webgl"
import * as wm from "../ui/wm.ts"
import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
// Import was unused
// import * as pt from "../transform.ts"

/**
 * Demo pipeline showing various types of annotations on graphs
 */
export async function annotationsDemo() {
    // Load sample history file
    const history = await binary.HistoryFile.load("longlightning.bin.gz")

    // Create windows
    const root = new wm.Window("Annotations Demo")
    document.getElementById("window-container")?.appendChild(root.element)

    // Create visualization windows

    const graphWindow = root.addWindow(new wm.Window("Graph Windows"))

    const grapherXWindow = graphWindow.addWindow(
        new wm.SvgWindow("X Position Graph", { preserveRatio: false }),
    )

    const grapherYWindow = graphWindow.addWindow(
        new wm.SvgWindow("Y Position Graph", { preserveRatio: false }),
    )

    // Create the grapher for visualizing keypoint data
    const grapher = new ui.KeypointGrapher(history, {
        title: "Keypoint Graph",
    })

    // Points of interest to display
    const poi = [
        "nose",
        "left_wrist",
        "right_wrist",
    ]

    // Draw the keypoint graphs
    for (const name of poi) {
        grapher.drawKeypointGraph(
            grapherYWindow,
            name as keyof typeof binary.KeypointName,
            "y",
        )
        grapher.drawKeypointGraph(
            grapherXWindow,
            name as keyof typeof binary.KeypointName,
            "x",
        )
    }

    // Draw skeleton
    const skeletonWindow = root.addWindow(
        new ui.Skeleton(history, "Skeleton View", { minScore: 0.2 }),
    )

    // Add history controls for playback
    const player = new ui.HistoryControls(history, skeletonWindow)

    // Add various annotation types to demonstrate functionality

    // 1. Horizontal threshold line
    grapher.addAnnotation(grapherYWindow, {
        type: "line",
        orientation: "horizontal",
        value: 0.5,
        color: "#ff3333",
        label: "Upper Threshold",
        dashArray: "5,5",
    })

    grapher.addAnnotation(grapherYWindow, {
        type: "line",
        orientation: "horizontal",
        value: 0.75,
        color: "#3333ff",
        label: "Lower Threshold",
        dashArray: "5,5",
    })

    // 2. Time marker (vertical line)
    // Save annotation ID but use it directly in updatePlayhead
    grapher.addAnnotation(grapherYWindow, {
        id: "playhead",
        type: "line",
        orientation: "vertical",
        value: history.getPoseAt(0).timestamp,
        color: "#33cc33",
        //        label: "Playhead",
    })

    // Copy playhead to X graph too
    grapher.addAnnotation(grapherXWindow, {
        id: "playhead",
        type: "line",
        orientation: "vertical",
        value: history.getPoseAt(0).timestamp,
        color: "#33cc33",
        //        label: "Playhead",
    })

    // 3. Region annotation (simulating detected event)
    const eventStart =
        history.getPoseAt(Math.floor(history.count * 0.3)).timestamp
    const eventEnd =
        history.getPoseAt(Math.floor(history.count * 0.5)).timestamp

    grapher.addAnnotation(grapherYWindow, {
        type: "region",
        value: eventStart,
        endValue: eventEnd,
        color: "rgba(0, 200, 0, 0.5)",
        label: "Detected Movement",
    })

    // 4. Point annotation
    const pointTime =
        history.getPoseAt(Math.floor(history.count * 0.7)).timestamp
    grapher.addAnnotation(grapherXWindow, {
        type: "point",
        value: pointTime,
        endValue: 127, // y-coordinate (centered)
        color: "#ff00ff",
        label: "Peak Value",
    })

    // 5. Text annotation
    grapher.addAnnotation(grapherXWindow, {
        type: "text",
        value: history.getPoseAt(Math.floor(history.count / 2)).timestamp,
        label: "motion sequence",
    })

    // Set up playhead update
    let currentFrame = 0

    // Update playhead position when frames change
    const updatePlayhead = () => {
        const timestamp = history.getPoseAt(currentFrame).timestamp

        // Update the playhead annotation on both graphs
        grapher.updateAnnotation(grapherYWindow, "playhead", {
            value: timestamp,
        })

        grapher.updateAnnotation(grapherXWindow, "playhead", {
            value: timestamp,
        })
    }

    // Hook into player events
    player.on("frameChanged", (frame: number) => {
        console.log("UPDATE PLAYEHAD", frame)
        currentFrame = frame
        updatePlayhead()
    })

    // Initialize with first frame
    player.nextFrame()
}
