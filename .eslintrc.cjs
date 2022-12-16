module.exports = {
    env: {
        node: true,
        es2021: true
    },
    extends: 'eslint:recommended',
    parser: '@babel/eslint-parser',
    parserOptions: {
        requireConfigFile: false,
    },
    rules: {
        'array-element-newline': ['error', 'consistent'],
        'comma-dangle': ['error', 'always-multiline'],
        'dot-location': ['error', 'property'],
        'func-names': ['error', 'never'],
        'function-call-argument-newline': ['error', 'consistent'],
        'generator-star-spacing': ['error', 'after'],
        'import/first': ['error'],
        'import/newline-after-import': ['error'],
        'import/no-duplicates': ['error'],
        'import/order': ['error'],
        'max-len': ['error', { code: 100, ignoreStrings: true, ignoreTemplateLiterals: true }],
        'no-extra-parens': ['error', 'functions'],
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'object-curly-spacing': ['error', 'always'],
        'padded-blocks': ['error', 'never'],
        'quote-props': ['error', 'consistent'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'space-before-function-paren': ['error', { anonymous: 'never', named: 'never', asyncArrow: 'always' }],
    },
    plugins: ['import'],
};
