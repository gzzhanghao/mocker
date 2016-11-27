import { connect } from 'net'

export default (port, hostname) => {
  const socket = connect(port, hostname)

  return new Promise((resolve, reject) => {

    socket.once('error', reject)

    socket.once('connect', () => {
      resolve(socket)
    })
  })
}
