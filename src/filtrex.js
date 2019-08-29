const Jison = require("./lib/jison").Jison;

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
exports.compileExpression =
function compileExpression(expression, options) {

    if (arguments.length > 2) throw new TypeError('Too many arguments.');

    options = typeof options === "object" ? options : {};
    let {extraFunctions, customProp} = options;
    for (let key of Object.getOwnPropertyNames(options))
    {
        if (key !== "extraFunctions" && key !== "customProp") throw new TypeError(`Unknown option: ${key}`);
    }


    var functions = {
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        log: Math.log,
        max: Math.max,
        min: Math.min,
        random: Math.random,
        round: Math.round,
        sqrt: Math.sqrt,
    };
    if (extraFunctions) {
        for (var name in extraFunctions) {
            if (extraFunctions.hasOwnProperty(name)) {
                functions[name] = extraFunctions[name];
            }
        }
    }
    if (!compileExpression.parser) {
        // Building the original parser is the heaviest part. Do it
        // once and cache the result in our own function.
        compileExpression.parser = filtrexParser();
    }
    var tree = compileExpression.parser.parse(expression);

    var js = [];
    js.push('return ');
    function toJs(node) {
        if (Array.isArray(node)) {
            node.forEach(toJs);
        } else {
            js.push(node);
        }
    }
    tree.forEach(toJs);
    js.push(';');

    function isfn(funcName) {
        return functions.hasOwnProperty(funcName) && typeof functions[funcName] === "function";
    }

    function unknown(funcName) {
        throw ReferenceError('Unknown function: ' + funcName + '()');
    }

    function coerceArray(value) {
        if (Array.isArray(value))
            return value;
        else
            return [value];
    }

    function coerceBoolean(value) {
        if (typeof value === 'boolean')
            return +value;
        else
            return value;
    }

    function prop(name, obj) {
        return Object.prototype.hasOwnProperty.call(obj||{}, name) ? obj[name] : undefined;
    }

    function safeGetter(obj) {
        return function get(name) {
            return Object.prototype.hasOwnProperty.call(obj||{}, name) ? obj[name] : undefined;
        }
    }

    function isSubset(a, b) {
        const A = coerceArray(a);
        const B = coerceArray(b);
        return +A.every( val => B.includes(val) );
    }

    if (typeof customProp === 'function') {
        prop = (name, obj) => coerceBoolean(customProp(name, safeGetter(obj), obj));
    }

    let func = new Function('functions', 'data', 'std', js.join(''));
    let std = { unknown, prop, isfn, isSubset };

    return function(data) {
        try {
            return func(functions, data, std);
        }
        catch (e)
        {
            return e;
        }
    };
}

function filtrexParser() {

    // Language parser powered by Jison <http://zaach.github.com/jison/>,
    // which is a pure JavaScript implementation of
    // Bison <http://www.gnu.org/software/bison/>.

    function code(args, skipParentheses) {
        var argsJs = args.map(function(a) {
            return typeof(a) == 'number' ? ('$' + a) : JSON.stringify(a);
        }).join(',');

        return skipParentheses
                ? '$$ = [' + argsJs + '];'
                : '$$ = ["(", ' + argsJs + ', ")"];';
    }

    var grammar = {
        // Lexical tokens
        lex: {
            rules: [
                ['\\*', 'return "*";'],
                ['\\/', 'return "/";'],
                ['-'  , 'return "-";'],
                ['\\+', 'return "+";'],
                ['\\^', 'return "^";'],
                ['\\%', 'return "%";'],
                ['\\(', 'return "(";'],
                ['\\)', 'return ")";'],
                ['\\,', 'return ",";'],
                ['==', 'return "==";'],
                ['\\!=', 'return "!=";'],
                ['\\~=', 'return "~=";'],
                ['>=', 'return ">=";'],
                ['<=', 'return "<=";'],
                ['<', 'return "<";'],
                ['>', 'return ">";'],
                ['\\?', 'return "?";'],
                ['\\:', 'return ":";'],
                ['and[^\\w]', 'return "and";'],
                ['or[^\\w]' , 'return "or";'],
                ['not[^\\w]', 'return "not";'],
                ['in[^\\w]', 'return "in";'],
                ['of[^\\w]', 'return "of";'],

                ['\\s+',  ''], // skip whitespace
                ['[0-9]+(?:\\.[0-9]+)?\\b', 'return "NUMBER";'], // 212.321

                ['[a-zA-Z$_][\\.a-zA-Z0-9$_]*',
                 `yytext = JSON.stringify(yytext);
                  return "SYMBOL";`
                ], // some.Symbol22

                [`'(?:[^\'])*'`,
                 `yytext = JSON.stringify(
                     yytext.substr(1, yyleng-2)
                  );
                  return "SYMBOL";`
                ], // 'some-symbol'

                [`"(?:\\\\"|\\\\\\\\|[^"\\\\])*"`,
                 `yytext = JSON.stringify(""+JSON.parse(yytext));
                  return "STRING";`
                ], // "any \"escaped\" string"

                // End
                ['$', 'return "EOF";'],
            ]
        },
        // Operator precedence - lowest precedence first.
        // See http://www.gnu.org/software/bison/manual/html_node/Precedence.html
        // for a good explanation of how it works in Bison (and hence, Jison).
        // Different languages have different rules, but this seems a good starting
        // point: http://en.wikipedia.org/wiki/Order_of_operations#Programming_languages
        operators: [
            ['left', '?', ':'],
            ['left', 'or'],
            ['left', 'and'],
            ['left', 'in'],
            ['left', '==', '!=', '~='],
            ['left', '<', '<=', '>', '>='],
            ['left', '+', '-'],
            ['left', '*', '/', '%'],
            ['left', '^'],
            ['left', 'not'],
            ['left', 'UMINUS'],
            ['left', 'of'],
        ],
        // Grammar
        bnf: {
            expressions: [ // Entry point
                ['e EOF', 'return $1;']
            ],
            e: [
                ['e + e'  , code([1, '+', 3])],
                ['e - e'  , code([1, '-', 3])],
                ['e * e'  , code([1, '*', 3])],
                ['e / e'  , code([1, '/', 3])],
                ['e % e'  , code([1, '%', 3])],
                ['e ^ e'  , code(['Math.pow(', 1, ',', 3, ')'])],
                ['- e'    , code(['-', 2]), {prec: 'UMINUS'}],
                ['e and e', code(['Number(', 1, '&&', 3, ')'])],
                ['e or e' , code(['Number(', 1, '||', 3, ')'])],
                ['not e'  , code(['Number(!', 2, ')'])],
                ['e == e' , code(['Number(', 1, '==', 3, ')'])],
                ['e != e' , code(['Number(', 1, '!=', 3, ')'])],
                ['e ~= e' , code(['Number(RegExp(', 3, ').test(', 1, '))'])],
                ['e < e'  , code(['Number(', 1, '<' , 3, ')'])],
                ['e <= e' , code(['Number(', 1, '<=', 3, ')'])],
                ['e > e'  , code(['Number(', 1, '> ', 3, ')'])],
                ['e >= e' , code(['Number(', 1, '>=', 3, ')'])],
                ['e ? e : e', code([1, '?', 3, ':', 5])],
                ['( e )'  , code([2])],
                ['( array , e )', code(['[', 2, ',', 4, ']'])],
                ['NUMBER' , code([1])],
                ['STRING' , code([1])],
                ['SYMBOL' , code(['std.prop(', 1, ', data)'])],
                ['SYMBOL of e', code(['std.prop(', 1, ',', 3, ')'])],
                ['SYMBOL ( )', code(['(std.isfn(', 1, ') ? functions[', 1, ']() : std.unknown(', 1, '))'])],
                ['SYMBOL ( argsList )', code(['(std.isfn(', 1, ') ? functions[', 1, '](', 3, ') : std.unknown(', 1, '))'])],
                ['e in e', code(['std.isSubset(', 1, ', ', 3, ')'])],
                ['e not in e', code(['+!std.isSubset(', 1, ', ', 4, ')'])],
            ],
            argsList: [
                ['e', code([1], true)],
                ['argsList , e', code([1, ',', 3], true)],
            ],
            inSet: [
                ['e', code(['o ==', 1], true)],
                ['inSet , e', code([1, '|| o ==', 3], true)],
            ],
            array: [
                ['e', code([1])],
                ['array , e', code([1, ',', 3], true)],
            ],
        }
    };
    return new Jison.Parser(grammar);
}