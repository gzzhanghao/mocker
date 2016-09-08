import { pki, md } from 'node-forge'
import { randomBytes } from 'crypto'

const CAAttrs = [
  {
    name: 'commonName',
    value: 'NodeMockerProxyCA'
  },
  {
    name: 'countryName',
    value: 'Internet'
  },
  {
    shortName: 'ST',
    value: 'Internet'
  },
  {
    name: 'localityName',
    value: 'Internet'
  },
  {
    name: 'organizationName',
    value: 'Node Mocker Proxy CA'
  },
  {
    shortName: 'OU',
    value: 'CA'
  }
]

const CAExtensions = [
  {
    name: 'basicConstraints',
    cA: true
  },
  {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  },
  {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: true,
    emailProtection: true,
    timeStamping: true
  },
  {
    name: 'nsCertType',
    client: true,
    server: true,
    email: true,
    objsign: true,
    sslCA: true,
    emailCA: true,
    objCA: true
  },
  {
    name: 'subjectKeyIdentifier'
  }
]

const ServerAttrs = [
  {
    name: 'countryName',
    value: 'Internet'
  },
  {
    shortName: 'ST',
    value: 'Internet'
  },
  {
    name: 'localityName',
    value: 'Internet'
  },
  {
    name: 'organizationName',
    value: 'Node Mocker Proxy CA'
  },
  {
    shortName: 'OU',
    value: 'Node Mocker Proxy Server Certificate'
  }
]

const ServerExtensions = [
  {
    name: 'basicConstraints',
    cA: false
  },
  {
    name: 'keyUsage',
    keyCertSign: false,
    digitalSignature: true,
    nonRepudiation: false,
    keyEncipherment: true,
    dataEncipherment: true
  },
  {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: false,
    emailProtection: false,
    timeStamping: false
  },
  {
    name: 'nsCertType',
    client: true,
    server: true,
    email: false,
    objsign: false,
    sslCA: false,
    emailCA: false,
    objCA: false
  },
  {
    name: 'subjectKeyIdentifier'
  }
]

function randomSerialNumber() {
  return randomBytes(16).toString('hex')
}

function generateCertificate({ keyLen, expires, subject, issuer, extensions, privateKey }) {
  const keys = pki.rsa.generateKeyPair(keyLen)
  const cert = pki.createCertificate()

  cert.publicKey = keys.publicKey
  cert.serialNumber = randomSerialNumber()

  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date(new Date().setFullYear(new Date().getFullYear() + expires))

  cert.setSubject(subject)
  cert.setIssuer(issuer)
  cert.setExtensions(extensions)

  cert.sign(privateKey || keys.privateKey, md.sha256.create())

  return {
    cert: pki.certificateToPem(cert),
    key: pki.privateKeyToPem(keys.privateKey),
    pub: pki.publicKeyToPem(keys.publicKey)
  }
}

export const generateCA = () => generateCertificate({
  keyLen: 2048,
  expires: 10,
  subject: CAAttrs,
  issuer: CAAttrs,
  extensions: CAExtensions
})

export const generateHostKeys = (ca, hosts) => generateCertificate({
  keyLen: 1024,
  expires: 2,
  subject: [{ name: 'commonName', value: hosts[0] }].concat(ServerAttrs),
  issuer: pki.certificateFromPem(ca.cert).issuer.attributes,
  extensions: ServerExtensions.concat([{
    name: 'subjectAltName',
    altNames: hosts.map(host => ({ type: 2, value: host }))
  }]),
  privateKey: pki.privateKeyFromPem(ca.key)
})
