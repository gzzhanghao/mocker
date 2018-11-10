import zlib from 'zlib'
import waitFor from 'event-to-promise'
import { PassThrough } from 'stream'

export default class StreamBuffer {

  raw = null

  chunks = []

  onEnd = null

  constructor(raw) {
    this.raw = raw
    this.onEnd = waitFor(raw, 'end')
    raw.on('data', chunk => {
      if (this.chunks) {
        this.chunks.push(chunk)
      }
    })
  }

  getStream(consume = true) {
    if (!this.chunks) {
      throw new Error('Stream already consumed')
    }
    const stream = new PassThrough()
    for (const chunk of this.chunks) {
      stream.write(chunk)
    }
    this.raw.on('data', chunk => {
      stream.write(chunk)
    })
    if (consume) {
      this.chunks = null
    }
    this.onEnd.then(() => {
      stream.end()
    })
    return stream
  }

  getDecodedStream(consume = true) {
    const raw = this.getStream(consume)

    const req = this.raw.req || this.raw
    const res = this.raw

    const { statusCode } = res
    const encoding = res.headers['content-encoding']

    if (req.method === 'HEAD' || statusCode === 204 || statusCode === 304) {
      return raw
    }

    if (encoding === 'gzip' || encoding === 'x-gzip') {
      return raw.pipe(zlib.createGunzip({
        flush: zlib.Z_SYNC_FLUSH,
        finishFlush: zlib.Z_SYNC_FLUSH,
      }))
    }

    if (encoding === 'deflate' || encoding === 'x-deflate') {
      const stream = new PassThrough()
      const body = raw.pipe(new PassThrough())
      raw.once('data', chunk => {
        if ((chunk[0] & 0x0F) === 0x08) {
          body.pipe(zlib.createInflate()).pipe(stream)
        } else {
          body.pipe(zlib.createInflateRaw()).pipe(stream)
        }
      })
      return stream
    }

    return raw
  }

  static cache = new WeakMap()

  static get(stream) {
    if (!StreamBuffer.cache.get(stream)) {
      StreamBuffer.cache.set(stream, new StreamBuffer(stream))
    }
    return StreamBuffer.cache.get(stream)
  }
}
