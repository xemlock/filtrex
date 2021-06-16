// Compile parser
const { parser } = require('./src/generateParser');
const parserSourceCode = parser.generate({ moduleType: 'esm' })

const Vinyl = require('vinyl')

// Create file from string
// via https://stackoverflow.com/a/23398200/1137334
function srcFromString(path, str) {
    var src = require('stream').Readable({ objectMode: true })
    src._read = function () {
      this.push(new Vinyl({
        cwd: '',
        base: SRC,
        path: path,
        contents: Buffer.from(str, 'utf-8')
      }))
      this.push(null)
    }
    return src
}


const pipe = require('util').promisify(require('stream').pipeline)
const { src, dest } = require('gulp')
const rename = require('gulp-rename')
const del = require('del')

const { rollup } = require('rollup')
const SRC = './src'
const DIST = './lib'


const clean =
exports.clean =
async function clean() {
    await del(`${DIST}/**`)
}

const buildEsm =
exports.buildEsm =
async function buildEsm() {
    await pipe(
        srcFromString(`${SRC}/parser.mjs`, parserSourceCode),
        dest(`${DIST}/esm/`)
    )
    await pipe(
        src([ `${SRC}/*.mjs`, `${SRC}/*.d.ts` ]),
        dest(`${DIST}/esm/`)
    )
}


const buildCjs =
exports.buildCjs =
async function buildCjs() {
    const bundle = await rollup({
        input: `${DIST}/esm/filtrex.mjs`
    });

    bundle.write({
        output: {
            dir: `${DIST}/cjs/`,
            format: 'cjs'
        }
    })
}

const build =
exports.default =
exports.build =
async function build() {
    await clean()
    await buildEsm()
    await buildCjs()
}
