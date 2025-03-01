// deno-lint-ignore-file no-explicit-any ban-types

export type SameLength<T extends any[]> = Extract<
    { [K in keyof T]: any },
    any[]
>

export type Curried<Args extends any[], R> = <P extends Partial<Args>>(
    ...args: P
) => Args extends [...SameLength<P>, ...infer Rest]
    ? (Rest extends [] ? R : Curried<Rest, R>)
    : never

/** Overload for generator functions (function*) */
export function curried<Args extends any[], Y, Ret, N>(
    fn: (...args: Args) => Generator<Y, Ret, N>,
): Curried<Args, Generator<Y, Ret, N>>

/** Overload for regular (non-generator) functions */
export function curried<Args extends any[], R>(
    fn: (...args: Args) => R,
): Curried<Args, R>

export function curried(fn: Function) {
    return function curried(this: any, ...args: any[]): any {
        if (args.length >= fn.length) {
            // All arguments provided – invoke the original function
            return fn.apply(this, args)
        } else {
            // Partially apply and return a function to accept the rest
            // Capture 'this' context for later use
            const context = this
            return function (this: any, ...nextArgs: any[]) {
                // Pass the original 'this' context when recursively calling curried
                return curried.apply(context, [...args, ...nextArgs])
            }
        }
    }
}
