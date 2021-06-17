import { defaultTag } from "./utils.mjs";
import { Jison } from "./lib/jison.mjs";

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

function noop(...args) {
    return [defaultTag(...args), parenless(...args)]
}

const _ = String.raw

const bool = "std.coerceBoolean"
const operatorCode = code`ops['${2}'](${1}, ${3})`

const grammar = {
    // Lexical tokens
    lex: {
        rules: [
            [_`\*`, `return "*" ;`],
            [_`\/`, `return "/" ;`],
            [_`-` , `return "-" ;`],
            [_`\+`, `return "+" ;`],
            [_`\^`, `return "^" ;`],
            [_`\%`, `return "%" ;`],
            [_`\(`, `return "(" ;`],
            [_`\)`, `return ")" ;`],
            [_`\,`, `return "," ;`],
            [_`==`, `return "==";`],
            [_`\!=`,`return "!=";`],
            [_`\~=`,`return "~=";`],
            [_`>=`, `return ">=";`],
            [_`<=`, `return "<=";`],
            [_`<` , `return "<" ;`],
            [_`>` , `return ">" ;`],
            [_`and[^\w]` , `return "and" ;`],
            [_`or[^\w]`  , `return "or"  ;`],
            [_`not[^\w]` , `return "not" ;`],
            [_`in[^\w]`  , `return "in"  ;`],
            [_`of[^\w]`  , `return "of"  ;`],
            [_`if[^\w]`  , `return "if"  ;`],
            [_`then[^\w]`, `return "then";`],
            [_`else[^\w]`, `return "else";`],

            [_`\s+`,  ''], // skip whitespace
            [_`[0-9]+(?:\.[0-9]+)?(?![0-9\.])`, `return "Number";`], // 212.321

            [_`[a-zA-Z$_][\.a-zA-Z0-9$_]*`,
                `yytext = JSON.stringify(yytext);
                return "Symbol";`
            ], // some.Symbol22

            [_`'(?:\\'|\\\\|[^'\\])*'`,
                `yytext = yy.buildString("'", yytext);
                return "Symbol";`
            ], // 'any \'escaped\' symbol'

            [_`"(?:\\"|\\\\|[^"\\])*"`,
                `yytext = yy.buildString('"', yytext);
                return "String";`
            ], // "any \"escaped\" string"

            // End
            [_`$`, 'return "EOF";'],
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
        ['left', '==', '!=', '<', '<=', '>', '>=', '~='],
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
            ['- e'    , code`ops['-'](${2})`, {prec: 'UMINUS'}],
            ['e + e'  , operatorCode],
            ['e - e'  , operatorCode],
            ['e * e'  , operatorCode],
            ['e / e'  , operatorCode],
            ['e % e'  , operatorCode],
            ['e ^ e'  , operatorCode],

            ['e and e', code`${bool}${1} && ${bool}${3}`],
            ['e or e' , code`${bool}${1} || ${bool}${3}`],
            ['not e'  , code`! ${bool}${2}`],

            ['e Relational e' , operatorCode, {prec: '=='}],

            ['if e then e else e', code`${bool}${2} ? ${4} : ${6}`],
            ['e in e', code`std.isSubset(${1}, ${3})`],
            ['e not in e', code`!std.isSubset(${1}, ${4})`],

            ['( e )'  , code`${2}`],
            ['( Arguments , e )', code`[ ${2}, ${4} ]`],

            ['Number' , code`${1}`],
            ['Symbol' , code`prop(${1}, data)`],
            ['String' , code`${1}`],
            ['Symbol of e', code`prop(${1}, ${3})`],

            ['Symbol ( )', code`call(${1})`],
            ['Symbol ( Arguments )', code`call(${1}, ${3})`],
        ],
        Relational: [
            noop`==`,
            noop`!=`,
            noop`~=`,
            noop`<`,
            noop`<=`,
            noop`>=`,
            noop`>`,
        ],
        Arguments: [
            ['e', parenless`${1}`],
            ['Arguments , e', parenless`${1}, ${3}`],
        ],
    }
};

export const parser = new Jison.Parser(grammar);
