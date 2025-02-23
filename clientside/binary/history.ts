import { EventEmitter } from "npm:eventemitter3"
import { BinaryPoseEmitter, BinaryPoseEvent } from "../types2.ts"
import { Pose } from "./pose.ts"

export class History extends EventEmitter<BinaryPoseEvent> {
    private buffer: ArrayBuffer
    private capacity: number
    private recordSize = Pose.RECORD_SIZE
    private writeIndex = 0
    private count = 0

    constructor(capacity: number = 10000) {
        super()
        this.capacity = capacity
        this.buffer = new ArrayBuffer(capacity * this.recordSize)
    }

    record(poseEmitter: BinaryPoseEmitter): void {
        poseEmitter.on("pose", (pose: Pose) => this.push(pose))
    }

    push(pose: Pose): void {
        const offset = this.writeIndex * this.recordSize
        new Uint8Array(this.buffer).set(
            new Uint8Array(pose.getBuffer()),
            offset,
        )
        this.writeIndex = (this.writeIndex + 1) % this.capacity
        if (this.count < this.capacity) this.count++
    }

    // Returns an iterator yielding history views (not copies)
    *poses(): Iterable<Pose> {
        const start = this.count === this.capacity ? this.writeIndex : 0
        for (let i = 0; i < this.count; i++) {
            const index = (start + i) % this.capacity
            const offset = index * this.recordSize
            yield new HistoryPose(this.buffer, offset)
        }
    }

    // Async replay iterator that respects timestamp differences
    async *iterate(): AsyncIterable<Pose> {
        let prevTimestamp: number | null = null
        for (const pose of this.poses()) {
            if (prevTimestamp !== null) {
                const delay = pose.timestamp - prevTimestamp
                await new Promise((res) => setTimeout(res, delay))
            }
            yield pose
            prevTimestamp = pose.timestamp
        }
    }

    async play() {
        for await (const pose of this.iterate()) {
            this.emit("pose", pose)
        }
    }

    async download(fileName: string): Promise<void> {
        let dataToDownload: ArrayBuffer
        if ("CompressionStream" in window) {
            const cs = new CompressionStream("gzip")
            const writer = cs.writable.getWriter()
            writer.write(new Uint8Array(this.buffer))
            writer.close()
            const compressedResponse = new Response(cs.readable)
            dataToDownload = await compressedResponse.arrayBuffer()
        } else {
            dataToDownload = this.buffer
        }
        const blob = new Blob([dataToDownload], { type: "application/gzip" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
    }

    static async load(url: string): Promise<History> {
        const response = await fetch(url)
        const compressedBuffer = await response.arrayBuffer()
        let arrayBuffer: ArrayBuffer
        if ("DecompressionStream" in window) {
            const blob = new Blob([compressedBuffer])
            const ds = new DecompressionStream("gzip")
            const decompressedStream = blob.stream().pipeThrough(ds)
            const decompressedResponse = new Response(decompressedStream)
            arrayBuffer = await decompressedResponse.arrayBuffer()
        } else {
            arrayBuffer = compressedBuffer
        }
        const recordSize = Pose.RECORD_SIZE
        if (arrayBuffer.byteLength % recordSize !== 0) {
            throw new Error("Invalid file size")
        }
        const capacity = arrayBuffer.byteLength / recordSize
        const history = new History(capacity)
        history.buffer = arrayBuffer
        history.count = capacity
        history.writeIndex = 0
        return history
    }
}

// A pose view that acts as a window into the larger history buffer.
export class HistoryPose extends Pose {
    constructor(buffer: ArrayBuffer, offset: number) {
        // Instead of allocating a new buffer, create a DataView into the given buffer.
        super()
        // Overwrite the internal view to point at the right slice without copying.
        this.buffer = buffer
        this.view = new DataView(buffer, offset, Pose.RECORD_SIZE)
    }
}
