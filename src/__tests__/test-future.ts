import {Future} from "../future";

type Counter = () => number;
type Creator = (incr: Counter) => Future<number>;

const counter = (fn: Creator) => {
    let i = 0;
    const future = fn(() => ++i);
    return {future, count: () => i};
}

describe("Future", () => {
    test("Construct", () => {
        expect(counter((incr) => new Future(incr)).count()).toEqual(0);
    });

    test("Empty Then", async () => {
        const {future, count} = counter((incr) => new Future(incr));
        expect(count()).toEqual(0);
        const test = future.then();
        expect(count()).toEqual(0);
        future.eval();
        await test;
        expect(count()).toEqual(1);
    });

    test("Simple Then", async () => {
        let thenval;
        const {future, count} = counter((incr) => new Future(incr));
        expect(count()).toEqual(0);
        expect(thenval).toBeUndefined();
        await future.then(v => thenval = v);
        expect(count()).toEqual(1);
        expect(thenval).toEqual(1);
    });

    test("Deferred Then", async () => {
        let thenval;
        const {future, count} = counter((incr) => new Future(incr, true));
        expect(count()).toEqual(0);
        expect(thenval).toBeUndefined();
        const then = future.then(v => thenval = v);
        expect(count()).toEqual(0);
        expect(thenval).toBeUndefined();
        future.eval();
        expect(count()).toEqual(1);
        expect(await then).toEqual(1);
        expect(thenval).toEqual(1);
    });
})
