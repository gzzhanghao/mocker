export default function connect(port, hostname) {
  const socket = net.connect(port, hostname)

  return new Promise((resolve, reject) => {

    socket.once('error', reject)

    socket.once('connect', () => {
      resolve(socket)
    })
  })
}
