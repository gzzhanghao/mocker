import { Server, WebSocket } from 'ws'

import Request from './Request'

export default class UpgradeRequest extends Request {

  constructor(upsteam, req, socket, head) {
    super(upsteam, req)
    this.socket = socket
    this.head = head
  }

  get href() {
    return this.protocol + super.href
  }

  get protocol() {
    if (this.headers['upgrade'].toUpperCase() === 'WEBSOCKET') {
      return this.secure ? 'wss:' : 'ws:'
    }
    return this.secure ? 'https:' : 'http:'
  }

  set protocol(value) {
    this.secure = ['wss:', 'https:'].includes(value)
  }

  send() {
    if (this.headers['upgrade'].toUpperCase() !== 'WEBSOCKET') {
      throw new Error(`Unsupported upgrade type '${this.headers['upgrade']}'`)
    }
    return new WebSocket(this.href)
  }

  accept() {
    return new Promise(resolve => {
      if (this.headers['upgrade'].toUpperCase() !== 'WEBSOCKET') {
        throw new Error(`Unsupported upgrade type '${this.headers['upgrade']}'`)
      }
      UpgradeRequest.wsServer.handleUpgrade(this.raw, this.socket, this.head, resolve)
    })
  }

  static wsServer = new Server({ noServer: true })
}
