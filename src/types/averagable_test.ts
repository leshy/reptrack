import { Averagable, average, Vector2D } from "./averagable.ts"

type TestSpec<T> = {
    type: typeof T
    data: T[]
    result: T
}

const tests: TestSpec<Averagable>[] = [
    { type: Number, data: [4, 3, 2, 1], result: 2.5 },
    {
        type: Vector2D,
        data: [new Vector2D(1, 2), new Vector2D(3, 4)],
        result: new Vector2D(2, 3),
    },
]

tests.forEach(({ type, data, result }) => {
    Deno.test(`average ${type.name}`, () => {
        const actual = average(data as Iterable<Averagable>)
        assertEquals(actual, result)
    })
})
