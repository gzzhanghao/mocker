import waitFor from 'event-to-promise'

import StreamBuffer from './StreamBuffer'

/**
 * @typedef {{ decode?: boolean, consume?: boolean }} StreamOptions
 */

export default {

  /**
   * @param {StreamOptions} options
   */
  stream(options = {}) {
    const buffer = StreamBuffer.get(this.raw)
    if (options.decode) {
      return buffer.getDecodedStream(options.consume)
    }
    return buffer.getStream(options.consume)
  },

  /**
   * @param {StreamOptions} options
   */
  async buffer(options = {}) {
    const stream = this.stream(options)
    const chunks = []
    stream.on('data', chunk => {
      chunks.push(chunk)
    })
    await waitFor(stream, 'end')
    return Buffer.concat(chunks)
  },

  /**
   * @param {StreamOptions} options
   */
  async text(options = {}) {
    return (await this.buffer({ ...options, decode: true })).toString()
  },

  /**
   * @param {StreamOptions} options
   */
  async json(options = {}) {
    return JSON.parse(await this.text(options) )
  },
}
