import { EventEmitter } from "npm:eventemitter3"

export class State<T> extends EventEmitter {
    constructor(public state: T) {
        super()
    }

    setState(state: T): T {
        this.state = state
        this.emit("change", this.state)
        return state
    }

    onChange(callback: (state: T) => void) {
        this.on("change", callback)
    }
}
