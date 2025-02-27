import * as binary from "../binary/mod.ts"
import * as ui from "../ui/mod.ts"
import { Env } from "../env.ts"
import { PoseEstimator, VideoWindow } from "../node/mod.ts"

export async function record() {
    const env = new Env(document)
    const root = new ui.Window()
    document.getElementById("window-container")?.appendChild(root.element)

    const video = root.addWindow(new VideoWindow("video.mp4"))
    const pose = new PoseEstimator(env, video)
    const svg = root.addWindow(
        new ui.SvgWindow("pose", {
            viewbox: "0 0 255 255",
            preserveRatio: true,
        }),
    )
    new ui.Skeleton(pose, svg)

    const recorder = new binary.HistoryFile(50000)
    recorder.record(pose)

    globalThis.recorder = recorder
    await pose.init()
}
