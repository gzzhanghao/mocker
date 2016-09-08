import net from 'net'

export default (port, hostname) => {
  const socket = net.connect(port, hostname)

  return new Promise((resolve, reject) => {

    socket.once('error', reject)

    socket.once('connect', () => {
      resolve(socket)
    })
  })
}
