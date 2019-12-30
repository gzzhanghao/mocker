import net from 'net'
import waitFor from 'event-to-promise'

/**
 * @param {{ hostname: string, port: number }} options
 */
export async function connect(options) {
  const socket = net.connect(options.port, options.hostname)
  await waitFor(socket, 'connect')
  return socket
}
