import { Pose } from "./pose.ts"

export class History {
    private buffer: ArrayBuffer
    private capacity: number
    private recordSize = Pose.RECORD_SIZE
    private writeIndex = 0
    private count = 0

    constructor(capacity: number) {
        this.capacity = capacity
        this.buffer = new ArrayBuffer(capacity * this.recordSize)
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
    async *replay(): AsyncIterable<Pose> {
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
