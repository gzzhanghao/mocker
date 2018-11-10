import waitFor from 'event-to-promise'

import StreamBuffer from './StreamBuffer'

export default {

  stream(options = {}) {
    const buffer = StreamBuffer.get(this.raw)
    if (options.decode) {
      return buffer.getDecodedStream(options.consume)
    }
    return buffer.getStream(options.consume)
  },

  async buffer(options) {
    const stream = this.stream(options)
    const chunks = []
    stream.on('data', chunk => {
      chunks.push(chunk)
    })
    await waitFor(stream, 'end')
    return Buffer.concat(chunks)
  },

  async text(options) {
    return (await this.buffer({ ...options, decode: true })).toString()
  },

  async json(options) {
    return JSON.parse(await this.text(options) )
  },
}
