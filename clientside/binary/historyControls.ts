// history-controls.ts
import { History } from "./history.ts"
import { Window } from "../ui/wm.ts"

export class HistoryPlayer {
    public frame = 0
    public isPlaying = false
    private stopFlag = false
    constructor(public history: History) {}
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

export class HistoryControls {
    private playStopBtn: HTMLButtonElement
    private prevBtn: HTMLButtonElement
    private nextBtn: HTMLButtonElement
    private seekBar: HTMLInputElement
    private frameLabel: HTMLSpanElement
    constructor(private window: Window, private player: HistoryPlayer) {
        const c = document.createElement("div")
        c.className = "controls"
        this.playStopBtn = document.createElement("button")
        this.playStopBtn.addEventListener("click", () => {
            if (!this.player.isPlaying) {
                this.player.play().catch(console.error)
            } else {
                this.player.stop()
            }
            this.updateUI()
        })
        c.appendChild(this.playStopBtn)
        this.prevBtn = document.createElement("button")
        this.prevBtn.textContent = "Prev Frm"
        this.prevBtn.addEventListener("click", () => {
            this.player.prevFrame()
            this.updateUI()
        })
        c.appendChild(this.prevBtn)
        this.nextBtn = document.createElement("button")
        this.nextBtn.textContent = "Next Frm"
        this.nextBtn.addEventListener("click", () => {
            this.player.nextFrame()
            this.updateUI()
        })
        c.appendChild(this.nextBtn)
        this.seekBar = document.createElement("input")
        this.seekBar.type = "range"
        this.seekBar.min = "0"
        this.seekBar.step = "1"
        this.seekBar.addEventListener("input", () => {
            if (this.player.isPlaying) {
                this.player.stop()
            }
            this.player.setFrame(parseInt(this.seekBar.value, 10))
            this.updateUI()
        })
        c.appendChild(this.seekBar)
        this.frameLabel = document.createElement("span")
        c.appendChild(this.frameLabel)
        this.player.history.on("pose", () => {
            this.updateUI()
        })
        window.element.appendChild(c)
        this.updateUI()
    }
    private updateUI() {
        this.playStopBtn.textContent = this.player.isPlaying ? "■" : "▶"
        this.seekBar.max = String(Math.max(this.player.total - 1, 0))
        this.seekBar.value = String(this.player.frame)
        const current = this.player.frame + 1
        const total = this.player.total
        this.frameLabel.textContent = `Frame: ${current} / ${total}`
    }
}

export class HistoryDisplay {
    constructor(private window: Window, private player: HistoryPlayer) {
        this.player.history.on("pose", () => {
            this.update()
        })
        this.update()
    }

    private update() {
        const current = this.player.frame + 1
        const total = this.player.total

        this.window.title = `[${current}/${total}]`
    }
}
