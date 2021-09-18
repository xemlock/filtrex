// the parser is dynamically generated from generateParser.js at compile time
import { parser } from './parser.mjs'
import { hasOwnProperty, bool, num, numstr, mod, arr, str, flatten, code } from './utils.mjs'

// Shared utility functions
const std =
{

    isfn(fns, funcName) {
        return hasOwnProperty(fns, funcName) && typeof fns[funcName] === "function"
    },

    unknown(funcName) {
        throw new ReferenceError('Unknown function: ' + funcName + '()')
    },

    coerceArray: arr,
    coerceNumber: num,
    coerceNumberOrString: numstr,
    coerceBoolean: bool,

    isSubset(a, b) {
        const A = arr(a)
        const B = arr(b)
        return A.every( val => B.includes(val) )
    },

    buildString(quote, literal)
    {
        quote = String(quote)[0]
        literal = String(literal)
        let built = ''

        if (literal[0] !== quote || literal[literal.length-1] !== quote)
            throw new Error(`Unexpected internal error: String literal doesn't begin/end with the right quotation mark.`)

        for (let i = 1; i < literal.length - 1; i++)
        {
            if (literal[i] === "\\")
            {
                i++;
                if (i >= literal.length - 1) throw new Error(`Unexpected internal error: Unescaped backslash at the end of string literal.`)

                if (literal[i] === "\\") built += '\\'
                else if (literal[i] === quote) built += quote
                else throw new Error(`Unexpected internal error: Invalid escaped character in string literal: ${literal[i]}`)
            }
            else if (literal[i] === quote)
            {
                throw new Error(`Unexpected internal error: String literal contains unescaped quotation mark.`)
            }
            else
            {
                built += literal[i]
            }
        }

        return JSON.stringify(built)
    },

    reduceRelation(arr) {

        const declarations = []
        const comparisons = []

        let previousExpression = flatten([arr[0]]).join('')
        let j = 0;

        for (let i = 1; i < arr.length - 1; i += 2)
        {
            const expr = flatten([arr[i+1]]).join('')
            const tempVar = `tmp${j++}`

            comparisons.push( `ops["${arr[i]}"](${previousExpression}, ${tempVar} = ${expr})` )
            previousExpression = tempVar
            declarations.push(tempVar)
        }

        return `(function(){ var ${ declarations.join(', ')}; return ${ comparisons.join(' && ') };})()`
    },
}

parser.yy = Object.create(std)

/**
 * Filtrex provides compileExpression() to compile user expressions to JavaScript.
 *
 * See https://github.com/joewalnes/filtrex for tutorial, reference and examples.
 * MIT License.
 *
 * Includes Jison by Zachary Carter. See http://jison.org/
 *
 * -Joe Walnes
 */
export function compileExpression(expression, options) {

    // Check and coerce arguments

    if (arguments.length > 2) throw new TypeError('Too many arguments.')

    options = typeof options === "object" ? options : {}
    let {extraFunctions, customProp, operators} = options
    for (const key of Object.keys(options))
    {
        if (!(["extraFunctions", "customProp", "operators"].includes(key)))
            throw new TypeError(`Unknown option: ${key}`)
    }



    // Functions available to the expression

    let functions = {
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        log: Math.log,
        log2: Math.log2,
        log10: Math.log10,
        max: Math.max,
        min: Math.min,
        round: Math.round,
        sqrt: Math.sqrt,
        exists: (v) => v !== undefined && v !== null,
        empty: (v) => v === undefined || v === null || v === '' || Array.isArray(v) && v.length === 0
    }

    if (extraFunctions) {
        for (const name of Object.keys(extraFunctions)) {
            functions[name] = extraFunctions[name]
        }
    }

    let defaultOperators = {
        '+': (a, b) => numstr(a) + numstr(b),
        '-': (a, b) => b === undefined ? -num(a) : num(a) - num(b),
        '*': (a, b) => num(a) * num(b),
        '/': (a, b) => num(a) / num(b),

        '%': (a, b) => mod(num(a), num(b)),
        '^': (a, b) => Math.pow(num(a), num(b)),

        '==': (a, b) => a === b,
        '!=': (a, b) => a !== b,

        '<': (a, b) => num(a) < num(b),
        '<=': (a, b) => num(a) <= num(b),
        '>=': (a, b) => num(a) >= num(b),
        '>': (a, b) => num(a) > num(b),

        '~=': (a, b) => RegExp(str(b)).test(str(a))
    }

    if (operators) {
        for (const name of Object.keys(operators)) {
            defaultOperators[name] = operators[name]
        }
    }

    operators = defaultOperators



    // Compile the expression

    let js = flatten( parser.parse(expression) )
    js.unshift('return ')
    js.push(';')


    // Metaprogramming functions

    function prop(name, obj) {
        if (hasOwnProperty(obj||{}, name))
            return obj[name]

        throw new ReferenceError(`Property “${name}” does not exist.`)
    }

    function safeGetter(obj) {
        return function get(name) {
            if (hasOwnProperty(obj||{}, name))
                return obj[name]

            throw new ReferenceError(`Property “${name}” does not exist.`)
        }
    }

    if (typeof customProp === 'function') {
        prop = (name, obj) => customProp(name, safeGetter(obj), obj)
    }

    function createCall(fns) {
        return function call(name, ...args) {
            if (hasOwnProperty(fns, name) && typeof fns[name] === "function")
                return fns[name](...args)

            throw new ReferenceError(`Unknown function: ${name}()`)
        }
    }



    // Patch together and return

    let func = new Function('call', 'ops', 'std', 'prop', 'data', js.join(''))

    return function(data) {
        try {
            return func(createCall(functions), operators, std, prop, data)
        }
        catch (e)
        {
            return e
        }
    };
}
