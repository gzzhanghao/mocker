module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: '8' } }],
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-export-default-from',
    ['babel-plugin-module-resolver', { root: ['./src'], alias: { '@': './src' } }],
  ],
}
