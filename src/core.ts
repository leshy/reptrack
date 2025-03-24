import * as utils from "./utils/mod.ts"
import * as binary from "./binary/mod.ts"

export const env = {
    keypoints: new utils.State(new Set<binary.KeypointName>()),
}
