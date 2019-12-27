import net from 'net'
import waitFor from 'event-to-promise'

export async function connect(port, hostname) {
  const socket = net.connect(port, hostname)
  await waitFor(socket, 'connect')
  return socket
}
