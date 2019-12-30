import Request from './Request'

export default class UpgradeRequest extends Request {

  accepted = false

  /**
   * @param {import('http').IncomingMessage} req
   * @param {import('net').Socket} socket
   * @param {Buffer} head
   */
  constructor(req, socket, head) {
    super(req)
    this.socket = socket
    this.head = head
  }

  get upgradeType() {
    return this.headers['upgrade'].toUpperCase()
  }

  get href() {
    return this.protocol + super.href
  }

  get protocol() {
    if (this.upgradeType === 'WEBSOCKET') {
      return this.secure ? 'wss:' : 'ws:'
    }
    return this.secure ? 'https:' : 'http:'
  }

  set protocol(value) {
    this.secure = ['wss:', 'https:'].includes(value)
  }

  /**
   * @returns {[import('http').IncomingMessage, import('net').Socket, Buffer]}
   */
  accept() {
    this.accepted = true
    return [this.raw, this.socket, this.head]
  }
}
