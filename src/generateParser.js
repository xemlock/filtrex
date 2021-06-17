const Jison = require("./lib/jison").Jison;

function _code(fragments, params, skipParentheses) {
    const args = []

    for (let i = 0; i < fragments.length - 1; i++) {
        args.push(fragments[i])
        args.push(params[i])
    }

    args.push(fragments[fragments.length - 1])

    const argsJs = args.map(function(a) {
        return typeof(a) == 'number' ? ('$' + a) : JSON.stringify(a);
    }).join(',');

    return skipParentheses
            ? '$$ = [' + argsJs + '];'
            : '$$ = ["(", ' + argsJs + ', ")"];';
}

function code(fragments, ...params) {
    return _code(fragments, params, false)
}

function parenless(fragments, ...params) {
    return _code(fragments, params, true)
}

const bool = "std.coerceBoolean"
const num = "std.coerceNumber"

const grammar = {
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
            ['and[^\\w]', 'return "and";'],
            ['or[^\\w]' , 'return "or";'],
            ['not[^\\w]', 'return "not";'],
            ['in[^\\w]', 'return "in";'],
            ['of[^\\w]', 'return "of";'],
            ['if[^\\w]', 'return "if";'],
            ['then[^\\w]', 'return "then";'],
            ['else[^\\w]', 'return "else";'],

            ['\\s+',  ''], // skip whitespace
            ['[0-9]+(?:\\.[0-9]+)?\\b', 'return "NUMBER";'], // 212.321

            ['[a-zA-Z$_][\\.a-zA-Z0-9$_]*',
                `yytext = JSON.stringify(yytext);
                return "SYMBOL";`
            ], // some.Symbol22

            [`'(?:\\\\'|\\\\\\\\|[^'\\\\])*'`,
                `yytext = yy.buildString("'", yytext);
                return "SYMBOL";`
            ], // 'any \'escaped\' symbol'

            [`"(?:\\\\"|\\\\\\\\|[^"\\\\])*"`,
                `yytext = yy.buildString('"', yytext);
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
        ['left', 'if', 'then', 'else'],
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
            ['e + e'  , code`${1} + ${3}`],
            ['e - e'  , code`${1} - ${3}`],
            ['e * e'  , code`${1} * ${3}`],
            ['e / e'  , code`${1} / ${3}`],
            ['e % e'  , code`${1} % ${3}`],
            ['e ^ e'  , code`Math.pow( ${1}, ${3} )`],
            ['- e'    , code`- ${2}`, {prec: 'UMINUS'}],
            ['e and e', code`${bool}(${1}) && ${bool}(${3})`],
            ['e or e' , code`${bool}(${1}) || ${bool}(${3})`],
            ['not e'  , code`! ${bool}(${2})`],
            ['e == e' , code`${1} === ${3}`],
            ['e != e' , code`${1} !== ${3}`],
            ['e ~= e' , code`RegExp(${3}).test(${1})`],
            ['e < e'  , code`${1} < ${3}`],
            ['e <= e' , code`${1} <= ${3}`],
            ['e > e'  , code`${1} > ${3}`],
            ['e >= e' , code`${1} >= ${3}`],
            ['if e then e else e', code`${bool}(${2}) ? ${4} : ${6}`],
            ['( e )'  , code`${2}`],
            ['( array , e )', code`[ ${2}, ${4} ]`],
            ['NUMBER' , code`${1}`],
            ['STRING' , code`${1}`],
            ['SYMBOL' , code`prop(${1}, data)`],
            ['SYMBOL of e', code`prop(${1}, ${3})`],
            ['SYMBOL ( )', code`std.isfn(fns, ${1}) ? fns[${1}]() : std.unknown(${1})`],
            ['SYMBOL ( argsList )', code`std.isfn(fns, ${1}) ? fns[${1}](${3}) : std.unknown(${1})`],
            ['e in e', code`std.isSubset(${1}, ${3})`],
            ['e not in e', code`!std.isSubset(${1}, ${4})`],
        ],
        argsList: [
            ['e', parenless`${1}`],
            ['argsList , e', parenless`${1}, ${3}`],
        ],
        inSet: [
            ['e', parenless`o === ${1}`],
            ['inSet , e', parenless`${1} || o === ${3}`],
        ],
        array: [
            ['e', parenless`${1}`],
            ['array , e', parenless`${1}, ${3}`],
        ],
    }
};

exports.parser = new Jison.Parser(grammar);
