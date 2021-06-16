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

