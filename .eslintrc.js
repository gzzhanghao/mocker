module.exports = {

  extends: [
    'eslint:recommended',
  ],

  parser: 'babel-eslint',

  env: {
    node: true,
    es6: true,
  },

  rules: {
    'indent': [2, 2, { SwitchCase: 1 }],
    'comma-dangle': [2, 'always-multiline'],
  },
}
