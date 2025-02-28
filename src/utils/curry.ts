// deno-lint-ignore no-explicit-any
export type SameLength<T extends any[]> = Extract<
    // deno-lint-ignore no-explicit-any
    { [K in keyof T]: any },
    // deno-lint-ignore no-explicit-any
    any[]
>

// deno-lint-ignore no-explicit-any
export type Curried<Args extends any[], R> = <P extends Partial<Args>>(
    ...args: P
) => Args extends [...SameLength<P>, ...infer Rest]
    ? (Rest extends [] ? R : Curried<Rest, R>)
    : never

/** Overload for generator functions (function*) */
// deno-lint-ignore no-explicit-any
export function curry<Args extends any[], Y, Ret, N>(
    fn: (...args: Args) => Generator<Y, Ret, N>,
): Curried<Args, Generator<Y, Ret, N>>

/** Overload for regular (non-generator) functions */
// deno-lint-ignore no-explicit-any
export function curry<Args extends any[], R>(
    fn: (...args: Args) => R,
): Curried<Args, R>

// deno-lint-ignore no-explicit-any
export function curry(fn: Function) {
    // deno-lint-ignore no-explicit-any
    return function curried(this: any, ...args: any[]): any {
        if (args.length >= fn.length) {
            // All arguments provided – invoke the original function
            return fn.apply(this, args)
        } else {
            // Partially apply and return a function to accept the rest
            // deno-lint-ignore no-explicit-any
            return (...nextArgs: any[]) => curried(...args, ...nextArgs)
        }
    }
}
