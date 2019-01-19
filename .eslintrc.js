module.exports = {
  "env": {
    "browser": true,
    "es6": true,
    "node": false,
    "jquery": true,
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 6
  },
  "rules": {
    "indent": ["error", 2],
    "linebreak-style": ["error", "unix"],
    "quotes": ["error", "single", { "allowTemplateLiterals": true }],
    "semi": ["error", "always" ],
    "no-console": ["error", { allow: ["warn", "error"] }],
    "no-undef": ["warn"],
    "no-unused-vars": ["warn"],
  }
};
