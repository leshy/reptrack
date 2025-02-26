import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
import { Env } from "../env.ts"
import * as node from "../node.ts"
import * as source from "../source.ts"

export async function record() {
    const env = new Env(document)
    const root = new ui.Window()
    document.getElementById("window-container")?.appendChild(root.element)

    const video = root.addWindow(new source.VideoWindow("video.mp4"))
    const pose = new node.PoseEstimator(env, video)
    const svg = root.addWindow(new ui.SvgWindow("pose", "0 0 255 255", true))
    new ui.SkeletonDraw(pose, svg.svg)

    const recorder = new binary.HistoryFile(50000)
    recorder.record(pose)

    window.recorder = recorder
    await pose.init()
}
