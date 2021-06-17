/**
 * Determines whether an object has a property with the specified name.
 * @param {object} obj the object to be checked
 * @param {string|number} prop property name
 */
export function hasOwnProperty(obj, prop) {
    if (typeof obj === "object" || typeof obj === "function") {
        return Object.prototype.hasOwnProperty.call(obj, prop)
    }

    return false
}

/**
 * Safe getter for `v[Symbol.toPrimitive]`.
 */
const _toPrimitive =
    typeof Symbol !== "function" || typeof Symbol.toPrimitive !== "symbol"
    ? () => undefined
    : (v) => {
        if (typeof v[Symbol.toPrimitive] === "function") {
            return v[Symbol.toPrimitive]
        }

        return undefined
    }

/**
 * Attempt to convert an object to the required primitive type.
 * @param {object} obj
 * @param {"string"|"number"|"bigint"} type
 * @returns {string|number|bigint|undefined}
 */
export function toPrimitive(obj, type) {
    if (typeof obj !== "object" || typeof obj !== "function") {
        return undefined
    }

    try {
        let val = _toPrimitive(obj)(type)
        if (typeof val === type) return val

        val = obj.valueOf()
        if (typeof val === type) return val

    } finally {
        return undefined
    }
}


/**
 * Mathematically correct modulo
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */

export function mod(a, b) {
    return (a % b + b) % b
}



// Type assertions/coertions

export function num(value) {
    const origValue = value

    if (value === undefined || value === null)
        throw new TypeError(`Expected a numeric value, but got ${value} instead.`)

    if (Array.isArray(value) && value.length === 1)
        value = value[0]

    if (typeof value === 'object')
        value = toPrimitive(value, 'number')

    if (typeof value === 'number')
        return value;

    throw new TypeError(`Expected a numeric value, but got an ${typeof origValue} instead.`)
}

export function str(value) {
    const origValue = value

    if (value === undefined || value === null)
        throw new TypeError(`Expected a text, but got ${value} instead.`)

    if (Array.isArray(value) && value.length === 1)
        value = value[0]

    if (typeof value === 'object')
        value = toPrimitive(value, 'string')

    if (typeof value === 'string')
        return value;

    throw new TypeError(`Expected a text, but got an ${typeof origValue} instead.`)
}

export function numstr(value) {
    const origValue = value
    let converted

    if (typeof value === 'string' || typeof value === 'number')
        return value

    if (value === undefined || value === null)
        throw new TypeError(`Expected a numeric value, but got ${value} instead.`)

    if (Array.isArray(value) && value.length === 1)
        value = value[0]

    if (typeof value === 'object') {
        converted = toPrimitive(value, 'number')

        if (typeof converted === 'number')
            return converted;

        converted = toPrimitive(value, 'string')

        if (typeof converted === 'string')
            return converted;
    }

    throw new TypeError(`Expected a text or a numeric value, but got an ${typeof origValue} instead.`)
}

export function bool(value) {
    if (typeof value === 'boolean')
        return value

    if (typeof value === 'object' && value instanceof Boolean)
        return value.valueOf();

    throw new TypeError(`Expected a boolean (“true” or “false”) value, but got an ${typeof value} instead.`)
}

export function arr(value) {
    if (value === undefined || value === null) {
        throw new TypeError(`Expected a list, but got ${value} instead.`)
    }

    if (Array.isArray(value)) {
        return value;
    } else {
        return [value];
    }
}
