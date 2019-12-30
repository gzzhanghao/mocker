import crypto from 'crypto'
import util from 'util'
import forge from 'node-forge'

const generateKeyPair = util.promisify(forge.pki.rsa.generateKeyPair)

const CAAttrs = [
  {
    name: 'commonName',
    value: 'NodeMockerProxyCA',
  },
  {
    name: 'countryName',
    value: 'Internet',
  },
  {
    shortName: 'ST',
    value: 'Internet',
  },
  {
    name: 'localityName',
    value: 'Internet',
  },
  {
    name: 'organizationName',
    value: 'Node Mocker Proxy CA',
  },
  {
    shortName: 'OU',
    value: 'CA',
  },
]

const CAExtensions = [
  {
    name: 'basicConstraints',
    cA: true,
  },
  {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true,
  },
  {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: true,
    emailProtection: true,
    timeStamping: true,
  },
  {
    name: 'nsCertType',
    client: true,
    server: true,
    email: true,
    objsign: true,
    sslCA: true,
    emailCA: true,
    objCA: true,
  },
  {
    name: 'subjectKeyIdentifier',
  },
]

const ServerAttrs = [
  {
    name: 'countryName',
    value: 'Internet',
  },
  {
    shortName: 'ST',
    value: 'Internet',
  },
  {
    name: 'localityName',
    value: 'Internet',
  },
  {
    name: 'organizationName',
    value: 'Node Mocker Proxy CA',
  },
  {
    shortName: 'OU',
    value: 'Node Mocker Proxy Server Certificate',
  },
]

const ServerExtensions = [
  {
    name: 'basicConstraints',
    cA: false,
  },
  {
    name: 'keyUsage',
    keyCertSign: false,
    digitalSignature: true,
    nonRepudiation: false,
    keyEncipherment: true,
    dataEncipherment: true,
  },
  {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: false,
    emailProtection: false,
    timeStamping: false,
  },
  {
    name: 'nsCertType',
    client: true,
    server: true,
    email: false,
    objsign: false,
    sslCA: false,
    emailCA: false,
    objCA: false,
  },
  {
    name: 'subjectKeyIdentifier',
  },
]

function randomSerialNumber() {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * @typedef CertificateOptions
 * @property {forge.pki.rsa.KeyPair} keys
 * @property {number} expires
 * @property {any[]} subject
 * @property {any[]} issuer
 * @property {any[]} extensions
 * @property {forge.pki.PrivateKey} [privateKey]
 *
 * @param {CertificateOptions} options
 */
function generateCertificate({ keys, expires, subject, issuer, extensions, privateKey }) {
  const cert = forge.pki.createCertificate()

  cert.publicKey = keys.publicKey
  cert.serialNumber = randomSerialNumber()

  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(new Date().setFullYear(new Date().getFullYear() + expires))

  cert.setSubject(subject)
  cert.setIssuer(issuer)
  cert.setExtensions(extensions)

  cert.sign(privateKey || keys.privateKey, forge.md.sha256.create())

  return {
    cert: forge.pki.certificateToPem(cert),
    key: forge.pki.privateKeyToPem(keys.privateKey),
  }
}

export function generateRootCAKey() {
  return generateCertificate({
    keys: forge.pki.rsa.generateKeyPairSync(2048),
    expires: 2,
    subject: CAAttrs,
    issuer: CAAttrs,
    extensions: CAExtensions,
  })
}

/**
 * @param {{ key: string, cert: string }} ca
 * @param {string[]} hosts
 */
export async function generateHostKey(ca, hosts) {
  return generateCertificate({
    keys: await generateKeyPair(2048),
    expires: 2,
    subject: [{ name: 'commonName', value: hosts[0] }].concat(ServerAttrs),
    issuer: forge.pki.certificateFromPem(ca.cert).issuer.attributes,
    extensions: ServerExtensions.concat([{
      name: 'subjectAltName',
      altNames: hosts.map(host => ({ type: 2, value: host })),
    }]),
    privateKey: forge.pki.privateKeyFromPem(ca.key),
  })
}
