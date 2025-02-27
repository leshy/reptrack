import { History } from "../binary/history.ts"
import { Window } from "./wm.ts"
import { Controls } from "./controls.ts"

export class HistoryControls extends Controls {
    public frame = 0
    public isPlaying = false
    private stopFlag = false
    public display: HistoryDisplay
    public speed = 1

    constructor(public history: History, window: Window) {
        super(window)
        this.display = new HistoryDisplay(window, this)
        this.initControls()
        console.log("HistoryControls constructed")
    }

    get total() {
        return this.history.count
    }

    nextFrame() {
        if (this.frame < this.total - 1) {
            this.frame++
            this.history.emit("pose", this.history.getPoseAt(this.frame))
        }
    }

    prevFrame() {
        if (this.frame > 0) {
            this.frame--
            this.history.emit("pose", this.history.getPoseAt(this.frame))
        }
    }

    setFrame(i: number) {
        if (i < 0) i = 0
        if (i >= this.total) i = this.total - 1
        this.frame = i
        this.history.emit("pose", this.history.getPoseAt(this.frame))
    }

    async play() {
        if (this.isPlaying) return
        this.isPlaying = true
        this.stopFlag = false
        while (!this.stopFlag && this.frame < this.total) {
            const pose = this.history.getPoseAt(this.frame)
            let delay = 0
            if (this.frame < this.total - 1) {
                const next = this.history.getPoseAt(this.frame + 1)
                delay = next.timestamp - pose.timestamp
            }
            this.history.emit("pose", pose)
            this.frame++
            if (delay > 0) {
                await new Promise((r) => setTimeout(r, delay / this.speed))
            }
        }
        this.isPlaying = false
        this.updatePlayButton()
    }

    stop() {
        if (!this.isPlaying) return
        this.stopFlag = true
        this.isPlaying = false
        this.updatePlayButton()
    }

    private initControls() {
        // Play/pause button
        this.addToggleButton(
            "playStop",
            ["▶", "■"],
            () => this.isPlaying,
            () => {
                if (!this.isPlaying) {
                    this.play().catch(console.error)
                } else {
                    this.stop()
                }
            },
        )

        // Previous frame button
        this.addButton("prev", "Prev Frm", () => {
            this.prevFrame()
        })

        // Next frame button
        this.addButton("next", "Next Frm", () => {
            this.nextFrame()
        })

        // Speed buttons as radio group
        this.addRadioGroup(
            "speed",
            [
                { id: "speed-slo", label: "slo", value: 0.01 },
                { id: "speed-1x", label: "1x", value: 1 },
                { id: "speed-10x", label: "10x", value: 10 },
                { id: "speed-100x", label: "100x", value: 100 },
            ],
            1, // Default speed is 1x
            (value) => {
                this.speed = value
            },
        )

        // Seek bar
        this.addSlider(
            "seekBar",
            0,
            Math.max(this.total - 1, 0),
            1,
            this.frame,
            (value) => {
                if (this.isPlaying) {
                    this.stop()
                }
                this.setFrame(value)
            },
        )

        // Update UI when pose changes
        this.history.on("pose", () => {
            this.updateSeekBar()
        })
    }

    private updatePlayButton() {
        this.updateControl("playStop", (button) => {
            ;(button as HTMLButtonElement).textContent = this.isPlaying
                ? "■"
                : "▶"
        })
    }

    private updateSeekBar() {
        this.updateControl("seekBar", (element) => {
            const slider = element as HTMLInputElement
            slider.max = String(Math.max(this.total - 1, 0))
            slider.value = String(this.frame)
        })
    }
}

export class HistoryDisplay {
    constructor(private window: Window, private controls: HistoryControls) {
        this.controls.history.on("pose", () => {
            this.update()
        })
        this.update()
    }

    private update() {
        const current = this.controls.frame + 1
        const total = this.controls.total

        this.window.title =
            `${this.controls.history.name} [${current}/${total}]`
    }
}
