/*
 * Copyright 2020 by Bob Kerns. Licensed under MIT license.
 */

// Test of whether source maps make it through to jest.

describe("Verify handling stack traces correctly.", () => {
   test("Test stack mapping", () => {
       try {
           // The following throw must be on line 15.
           //
           //
           //
           // noinspection ExceptionCaughtLocallyJS
           throw new Error("E"); // This must be line 15.
       } catch (e) {
           expect(e.message).toBe("E");
           expect(e.stack).toMatch(/[/\\]error-handling.ts[^a-zA-Z0-9]+15/m);
       }
   })
});
