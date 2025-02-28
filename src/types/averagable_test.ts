import { Averagable, average, equals, Vector2D } from "./averagable.ts"
import {
    assert,
    assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts"

type TestEntry<T extends Averagable> = {
    name: string
    data: T[]
    result: T
}

const testGrid: TestEntry<Averagable>[] = [
    { name: "number", data: [4, 2, 3, 1], result: 2.5 },
    {
        name: "vector",
        data: [new Vector2D(1, 2), new Vector2D(3, 4)],
        result: new Vector2D(2, 3),
    },
]

testGrid.forEach(
    <T extends Averagable>({ name, data, result }: TestEntry<T>) => {
        Deno.test(`average ${name}`, () => {
            // @ts-ignore
            const actual = average(data)
            // @ts-ignore
            assertEquals(actual, result)
        })

        Deno.test(`average ${name} against itself`, () => {
            assert(
                equals(
                    data[0],
                    // @ts-ignore
                    average([data[0], data[0]]),
                ),
            )
        })
    },
)
