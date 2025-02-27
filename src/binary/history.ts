import { EventEmitter } from "npm:eventemitter3"
import { BinaryPoseEmitter, BinaryPoseEvent } from "../types.ts"
import { Pose } from "./pose.ts"

export class History extends EventEmitter<BinaryPoseEvent> {
    public buffer: ArrayBuffer
    public writeIndex = 0
    public count = 0
    public capacity: number
    public recordSize = Pose.RECORD_SIZE
    public name: string = "History"
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

    *poses(): Iterable<Pose> {
        const start = this.count === this.capacity ? this.writeIndex : 0
        for (let i = 0; i < this.count; i++) {
            const index = (start + i) % this.capacity
            const offset = index * this.recordSize
            yield new HistoryPose(this.buffer, offset)
        }
    }

    *keypoints(index: number): Iterable<[number, [number, number, number]]> {
        for (const pose of this.poses()) {
            yield [pose.timestamp, pose.getKeypoint(index)]
        }
    }

    getPoseAt(i: number): Pose {
        if (this.count === 0) throw new Error("No poses")
        if (i < 0) i = 0
        if (i >= this.count) i = this.count - 1
        const start = this.count === this.capacity ? this.writeIndex : 0
        const actualIndex = (start + i) % this.capacity
        const offset = actualIndex * this.recordSize
        return new HistoryPose(this.buffer, offset)
    }

    get startTime() {
        return this.getPoseAt(0).timestamp
    }

    get endTime() {
        return this.getPoseAt(this.count - 1).timestamp
    }
}

export class HistoryPose extends Pose {
    constructor(buffer: ArrayBuffer, offset: number) {
        super()
        this.buffer = buffer
        this.view = new DataView(buffer, offset, Pose.RECORD_SIZE)
    }
}
export class HistoryFile extends History {
    override name: string

    constructor(capacity: number = 10000, url: string = "local") {
        super(capacity)
        this.name = url
    }

    async download(fileName: string): Promise<void> {
        let dataToDownload: ArrayBuffer = this.getOrderedBuffer()

        if ("CompressionStream" in globalThis) {
            const cs = new CompressionStream("gzip")
            const writer = cs.writable.getWriter()
            writer.write(new Uint8Array(dataToDownload))
            writer.close()
            const compressedResponse = new Response(cs.readable)
            dataToDownload = await compressedResponse.arrayBuffer()
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

    private getOrderedBuffer(): ArrayBuffer {
        const start = this.count === this.capacity ? this.writeIndex : 0
        const dataSize = this.count * this.recordSize
        const orderedBuffer = new ArrayBuffer(dataSize)
        const targetArray = new Uint8Array(orderedBuffer)
        const sourceArray = new Uint8Array(this.buffer)

        if (this.count === this.capacity) {
            // Buffer is full and has started cycling
            const firstPart = sourceArray.subarray(start * this.recordSize)
            const secondPart = sourceArray.subarray(0, start * this.recordSize)
            targetArray.set(firstPart)
            targetArray.set(secondPart, firstPart.length)
        } else {
            // Buffer is not full yet
            targetArray.set(sourceArray.subarray(0, dataSize))
        }

        return orderedBuffer
    }

    static async load(url: string): Promise<History> {
        const response = await fetch(url)
        const compressedBuffer = await response.arrayBuffer()
        let arrayBuffer: ArrayBuffer
        if ("DecompressionStream" in globalThis) {
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
        const history = new HistoryFile(capacity, url)
        history.buffer = arrayBuffer
        history.count = capacity
        history.writeIndex = 0
        return history
    }
}
