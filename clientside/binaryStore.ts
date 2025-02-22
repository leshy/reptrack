export enum KeypointName {
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
    "body_center",
}

type KeypointNames = keyof typeof KeypointName

class HistoryPose {
    private data: Int16Array
    private offset: number
    private keypointIndices: Map<KeypointNames, number>

    constructor(
        data: Int16Array,
        offset: number,
        keypointIndices: Map<KeypointNames, number>,
    ) {
        this.data = data
        this.offset = offset
        this.keypointIndices = keypointIndices
    }

    /** Get the coordinates for a given keypoint by name */
    get(keypoint: KeypointNames): [number, number] {
        const index = this.keypointIndices.get(keypoint)
        if (index === undefined) {
            throw new Error(`Keypoint ${keypoint} not found`)
        }
        const x = this.data[this.offset + index * 2]
        const y = this.data[this.offset + index * 2 + 1]
        return [x === -1 ? NaN : x / 100, y === -1 ? NaN : y / 100]
    }

    /** Specific getters for each keypoint */
    get nose(): [number, number] {
        return this.get("nose")
    }
    get left_eye(): [number, number] {
        return this.get("left_eye")
    }
    get right_eye(): [number, number] {
        return this.get("right_eye")
    }
    get left_ear(): [number, number] {
        return this.get("left_ear")
    }
    get right_ear(): [number, number] {
        return this.get("right_ear")
    }
    get left_shoulder(): [number, number] {
        return this.get("left_shoulder")
    }
    get right_shoulder(): [number, number] {
        return this.get("right_shoulder")
    }
    get left_elbow(): [number, number] {
        return this.get("left_elbow")
    }
    get right_elbow(): [number, number] {
        return this.get("right_elbow")
    }
    get left_wrist(): [number, number] {
        return this.get("left_wrist")
    }
    get right_wrist(): [number, number] {
        return this.get("right_wrist")
    }
    get left_hip(): [number, number] {
        return this.get("left_hip")
    }
    get right_hip(): [number, number] {
        return this.get("right_hip")
    }
    get left_knee(): [number, number] {
        return this.get("left_knee")
    }
    get right_knee(): [number, number] {
        return this.get("right_knee")
    }
    get left_ankle(): [number, number] {
        return this.get("left_ankle")
    }
    get right_ankle(): [number, number] {
        return this.get("right_ankle")
    }
    get body_center(): [number, number] {
        return this.get("body_center")
    }
}

class History {
    public data: Int16Array
    private maxPoses: number
    private stride: number
    private head: number = 0
    private count: number = 0
    private keypoints: KeypointNames[]
    private keypointIndices: Map<KeypointNames, number>

    constructor(
        maxPoses: number,
        keypoints: KeypointNames[] = Object.keys(
            KeypointName,
        ) as KeypointNames[],
    ) {
        this.maxPoses = maxPoses
        this.keypoints = keypoints
        this.stride = this.keypoints.length * 2 // 2 values (x, y) per keypoint
        this.data = new Int16Array(maxPoses * this.stride)
        this.keypointIndices = new Map(
            this.keypoints.map((kp, index) => [kp, index]),
        )
    }

    /** Add a new pose to the history */
    addPose(pose: Partial<Record<KeypointNames, [number, number]>>) {
        const offset = this.head * this.stride
        this.keypoints.forEach((kp, index) => {
            const point = pose[kp]
            const x = point ? Math.round(point[0] * 100) : -1
            const y = point ? Math.round(point[1] * 100) : -1
            this.data[offset + index * 2] = x
            this.data[offset + index * 2 + 1] = y
        })
        this.head = (this.head + 1) % this.maxPoses
        if (this.count < this.maxPoses) this.count++
    }

    /** Iterate over all poses in the history */
    *Poses(): IterableIterator<HistoryPose> {
        const start = (this.head - this.count + this.maxPoses) % this.maxPoses
        for (let i = 0; i < this.count; i++) {
            const poseIndex = (start + i) % this.maxPoses
            const offset = poseIndex * this.stride
            yield new HistoryPose(this.data, offset, this.keypointIndices)
        }
    }
}

const history = new History(300)
history.addPose({
    nose: [1.5, 2.3],
    left_eye: [1.6, 2.4],
    // ... other keypoints
})

for (const pose of history.Poses()) {
    console.log(pose.nose) // [1.5, 2.3]
    console.log(pose.left_eye) // [1.6, 2.4]
    console.log(pose.right_knee) // [NaN, NaN] if not provided
    console.log(history.data)
}
