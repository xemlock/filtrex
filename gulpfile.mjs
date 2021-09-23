import { parser } from './src/generateParser.mjs'
import { Readable, pipeline as _pipe } from 'stream'
import { promisify } from 'util'
import { rollup } from 'rollup'

import Vinyl from 'vinyl'
import beautify from 'gulp-beautify'
import rename from 'gulp-rename'
import del from 'del'

// fml, this is the last time i develop for node
const { src, dest } = (await import('gulp')).default
const uglify = (await import('gulp-uglify-es')).default.default

const pipe = promisify(_pipe)


// Create file from string
// via https://stackoverflow.com/a/23398200/1137334
function srcFromString(path, str) {
    var src = Readable({ objectMode: true })
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




const SRC = './src'
const DIST = './dist'

const parserSourceCode = parser.generate({ moduleType: 'esm' })


export async function clean() {
    await del(`${DIST}/**`)
}

export async function buildEsNext() {
    await pipe(
        srcFromString(`${SRC}/parser.mjs`, parserSourceCode),
        beautify({ indent_size: 4, end_with_newline: true }),
        dest(`${DIST}/esnext/`)
    )
    await pipe(
        src([ `${SRC}/*.mjs`, `${SRC}/*.d.ts` ]),
        dest(`${DIST}/esnext/`)
    )
}

export async function buildEsm() {
    const bundle = await rollup({
        input: `${DIST}/esnext/filtrex.mjs`
    });

    await bundle.write({
        output: {
            dir: `${DIST}/esm/`,
            format: 'esm',
            entryFileNames: '[name].mjs'
        }
    })

    await pipe( src(`${SRC}/filtrex.d.ts`), dest(`${DIST}/esm/`) )
}

export async function buildCjs() {
    const bundle = await rollup({
        input: `${DIST}/esnext/filtrex.mjs`
    });

    await bundle.write({
        output: {
            dir: `${DIST}/cjs/`,
            format: 'cjs'
        }
    })

    await pipe( src(`${SRC}/filtrex.d.ts`), dest(`${DIST}/cjs/`) )
}

export async function buildBrowser() {
    const bundle = await rollup({
        input: `${DIST}/esnext/filtrex.mjs`
    });

    await bundle.write({
        output: {
            name: 'filtrex',
            dir: `${DIST}/browser/`,
            format: 'iife'
        }
    })

    await pipe(
        src(`${DIST}/browser/filtrex.js`),
        uglify(),
        rename(path => path.basename += '.min'),
        dest(`${DIST}/browser/`)
    )

    await pipe( src(`${SRC}/filtrex.d.ts`), dest(`${DIST}/browser/`) )
}

export async function build() {
    await clean()
    await buildEsNext()
    await buildEsm()
    await buildCjs()
    await buildBrowser()
}

export default build
