import { connect } from 'net'

export default req => {
  const socket = connect(req.port, req.hostname)

  return new Promise((resolve, reject) => {

    socket.once('error', reject)

    socket.once('connect', () => {
      resolve(socket)
    })
  })
}
