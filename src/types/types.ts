export type TypedArray =
    | Int8Array
    | Uint8Array
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array

export type AnyArray<T> = TypedArray | Array<T>

export function isTypedArray(data: unknown): data is TypedArray {
    return data instanceof Int8Array ||
        data instanceof Uint8Array ||
        data instanceof Int16Array ||
        data instanceof Uint16Array ||
        data instanceof Int32Array ||
        data instanceof Uint32Array ||
        data instanceof Float32Array ||
        data instanceof Float64Array
}

export function isAnyArray<T>(data: unknown): data is AnyArray<T> {
    return Array.isArray(data) || isTypedArray(data)
}

export function isObject<T>(value: unknown): value is Record<string, T> {
    return typeof value === "object" && value !== null
}
