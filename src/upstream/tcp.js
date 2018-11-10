import { connect } from 'net'

export function createTCPConnection(req) {
  const socket = connect(req.port, req.hostname)

  return new Promise((resolve, reject) => {

    socket.once('error', reject)

    socket.once('connect', () => {
      resolve(socket)
    })
  })
}
