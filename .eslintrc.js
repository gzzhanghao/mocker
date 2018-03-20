module.exports = {

  parser: 'babel-eslint',

  parserOptions: {
    sourceType: 'module',
  },

  env: {
    node: true,
    es6: true,
  },

  extends: [
    'eslint:recommended',
  ],
}
