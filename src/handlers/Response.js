import zlib from 'zlib'
import waitFor from 'event-to-promise'
import { PassThrough } from 'stream'

const INTERNAL = Symbol('Response Internals')

export default class Response {

  [INTERNAL] = {
    body: [],
    raw: null,
    stream: null,
    promise: null,
  }

  encoding = 'utf-8'

  constructor(req, res, options = {}) {
    this.req = req
    this.raw = res
    this.body = res.pipe(new PassThrough)

    if (!options.passThrough) {
      this[INTERNAL].raw = res.pipe(new PassThrough({ highWaterMark: Infinity }))
    }
  }

  get statusCode() {
    return this.raw.statusCode
  }

  get headers() {
    return this.raw.headers
  }

  async stream() {
    await consumeBody(this)
    const stream = new PassThrough
    for (const chunk of this[INTERNAL].body) {
      stream.write(chunk)
    }
    this[INTERNAL].stream.pipe(stream)
    return stream
  }

  buffer() {
    return consumeBody(this)
  }

  text() {
    return this.buffer().then(buf => buf.toString(this.encoding))
  }

  json() {
    return this.text().then(text => JSON.parse(text))
  }
}

function consumeBody(res) {
  const internal = res[INTERNAL]

  if (!internal.promise) {
    internal.promise = (async () => {
      internal.stream = internal.raw.pipe(await getDecoder(res))

      internal.stream.on('data', chunk => {
        internal.body.push(chunk)
      })

      await waitFor(internal.stream, 'end')

      internal.body = [Buffer.concat(internal.body)]

      return internal.body[0]
    })()
  }

  return internal.promise
}

async function getDecoder(res) {
  const encoding = res.headers['content-encoding']

  if (!res.req.compress || res.req.method === 'HEAD' || encoding === null || res.statusCode === 204 || res.statusCode === 304) {
    return new PassThrough
  }
  if (encoding === 'gzip' || encoding === 'x-gzip') {
    return zlib.createGunzip({ flush: zlib.Z_SYNC_FLUSH, finishFlush: zlib.Z_SYNC_FLUSH })
  }
  if (encoding === 'deflate' || encoding === 'x-deflate') {
    const firstChunk = await waitFor(res, 'data')
    if ((firstChunk[0] & 0x0F) === 0x08) {
      return zlib.createInflate()
    }
    return zlib.createInflateRaw()
  }
  return new PassThrough
}
