import Request from './Request'

export default class UpgradeRequest extends Request {

  upgrade = true

  accepted = false

  constructor(upsteam, req, socket, head) {
    super(upsteam, req)
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

  accept() {
    this.accepted = true
    return [this.raw, this.socket, this.head]
  }
}
