const { compileExpression } = require("../dist/cjs/filtrex");

const { describe, it } = require("mocha");
const { expect } = require("chai");

const eval = (str, obj) => compileExpression(str)(obj);

describe("String support", () => {
  it("does string functions", () => {
    expect(eval("len(foo)", { foo: "hello" })).equals(5);
    expect(eval("lower(foo)", { foo: "HeLLo" })).equals("hello");
    expect(eval("upper(foo)", { foo: "hello" })).equals("HELLO");

    expect(eval('len("hello")')).equals(5);
    expect(eval('lower("HeLLo")')).equals("hello");
    expect(eval('upper("hello")')).equals("HELLO");
  });
});
