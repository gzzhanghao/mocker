/**
 * Parse an URL with fuzzy rules
 *
 * @param   {string} url
 *
 * @returns {Object} URL descriptor
 *
 * assumptions:
 * - Protocol must have trailing slashes
 * - Pathname must have leading slash
 */

const protocol = String.raw`(?<protocol>[^:/?]+:?)`
const hostname = String.raw`(?<hostname>(\[[^\]]+\]|[^:/?]+))`
const port     = String.raw`(?<port>[^:/?]+)`
const pathname = String.raw`(?<pathname>\/[^?]*)`
const search   = String.raw`(?<search>\?.*)`

const host     = String.raw`(${hostname}?(:${port})?)`
const path     = String.raw`(?<path>${pathname}?${search}?)`
const origin   = String.raw`(${protocol}?//${host}?)`

const parser = new RegExp(`^${origin}?${path}?$`)

export default function parseURL(url) {
  const result = url.match(parser)
  if (result) {
    return result.groups
  }
  throw new Error(`Malformed pattern '${url}'`)
}
