/**
 * Parse an URL with fuzzy rules
 *
 * @param   {string} url
 *
 * @returns {Object} URL descriptor
 *
 * @assumptions:
 * - Protocol must have trailing slashes
 * - Pathname must have leading slash
 */

const protocol = '(([^\\/:]+):?)'
const username = '([^:@\\/\\?#]+)'
const password = '([^@\\/\\?#]+)'
const hostname = '([^:\\/\\?#]+)'
const port     = '(:([^\\/\\?#]+))'
const pathname = '(\\/[^\\?#]*)'
const search   = '(\\?[^#]*)'
const hash     = '(#.*)'

const auth = `(${username}(:${password})?)`
const host = `(${hostname}${port}?)`
const path = `((${pathname}?${search}?)${hash}?)`

const parser = new RegExp(`^((${protocol}?//)?(${auth}@)?${host})?${path}?$`)

export default function parseURL(url) {
  const [,,,,protocol,,auth,username,,password,host,hostname,,port,,path,pathname,search,hash] = url.match(parser)
  return { protocol, auth, username, password, host, hostname, port, path, pathname, search, hash }
}
