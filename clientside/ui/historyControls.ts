import { History } from "../binary/history.ts"
import { Window } from "./wm.ts"

export class HistoryControls {
    public frame = 0
    public isPlaying = false
    private stopFlag = false
    public display: HistoryDisplay
    public buttons: HistoryButtons

    constructor(public history: History, public window: Window) {
        this.display = new HistoryDisplay(window, this)
        this.buttons = new HistoryButtons(window, this)
        console.log("constructed")
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
                await new Promise((r) => setTimeout(r, delay))
            }
        }
        this.isPlaying = false
    }
    stop() {
        if (!this.isPlaying) return
        this.stopFlag = true
        this.isPlaying = false
    }
}

export class HistoryButtons {
    private playStopBtn: HTMLButtonElement
    private prevBtn: HTMLButtonElement
    private nextBtn: HTMLButtonElement
    private seekBar: HTMLInputElement
    constructor(private window: Window, private controls: HistoryControls) {
        const c = document.createElement("div")
        c.className = "controls"
        this.playStopBtn = document.createElement("button")
        this.playStopBtn.addEventListener("click", () => {
            if (!this.controls.isPlaying) {
                this.controls.play().catch(console.error)
            } else {
                this.controls.stop()
            }
            this.updateUI()
        })
        c.appendChild(this.playStopBtn)
        this.prevBtn = document.createElement("button")
        this.prevBtn.textContent = "Prev Frm"
        this.prevBtn.addEventListener("click", () => {
            this.controls.prevFrame()
            this.updateUI()
        })
        c.appendChild(this.prevBtn)
        this.nextBtn = document.createElement("button")
        this.nextBtn.textContent = "Next Frm"
        this.nextBtn.addEventListener("click", () => {
            this.controls.nextFrame()
            this.updateUI()
        })
        c.appendChild(this.nextBtn)
        this.seekBar = document.createElement("input")
        this.seekBar.type = "range"
        this.seekBar.min = "0"
        this.seekBar.step = "1"
        this.seekBar.addEventListener("input", () => {
            if (this.controls.isPlaying) {
                this.controls.stop()
            }
            this.controls.setFrame(parseInt(this.seekBar.value, 10))
            this.updateUI()
        })
        c.appendChild(this.seekBar)
        this.controls.history.on("pose", () => {
            this.updateUI()
        })
        this.window.element.appendChild(c)
        this.updateUI()
    }
    private updateUI() {
        this.playStopBtn.textContent = this.controls.isPlaying ? "■" : "▶"
        this.seekBar.max = String(Math.max(this.controls.total - 1, 0))
        this.seekBar.value = String(this.controls.frame)
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
