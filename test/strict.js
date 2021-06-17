const { compileExpression } = require("../dist/cjs/filtrex");

const { describe, it } = require("mocha");
const { expect } = require("chai");

const eval = (str, obj) => compileExpression(str)(obj);

describe('Strict type checking', () => {

    it('checks for booleans', () => {
        expect(eval('1 == 1 and 1')).is.instanceOf(TypeError)
        expect(eval('1 or 1 != 1')).is.instanceOf(TypeError)
        expect(eval('not "hello"')).is.instanceOf(TypeError)
    })

})
