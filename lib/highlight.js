import fs from 'node:fs/promises';
import oniguruma from 'vscode-oniguruma';
import textmate from 'vscode-textmate';
import * as EncodedTokenAttributes from './encodedTokenAttributes.js';

import availableGrammars from './grammars/index.js';

const NEWLINE_REGEXP = /\r?\n|\r/g;

export function createTextmateRegistry(theme) {
    const onigLib = fs.readFile('./node_modules/vscode-oniguruma/release/onig.wasm')
        .then(async (data) => {
            await oniguruma.loadWASM(data.buffer);
            return {
                createOnigScanner(patterns) {
                    return new oniguruma.OnigScanner(patterns);
                },
                createOnigString(s) {
                    return new oniguruma.OnigString(s);
                },
            };
        });

    const cachedGrammars = {};

    return new textmate.Registry({
        onigLib,
        theme,
        async loadGrammar(scopeName) {
            if (scopeName in cachedGrammars) {
                return cachedGrammars[scopeName];
            }
            if (scopeName in availableGrammars) {
                const grammarPath = availableGrammars[scopeName];
                const data = await fs.readFile(grammarPath, 'utf-8');
                const grammar = JSON.parse(data);
                cachedGrammars[scopeName] = grammar;
                return grammar;
            }
            return null;
        },
    });
}

export function tokenizeWithTheme(contents, grammar, colorMap, options = {}) {
    const lines = contents.trimEnd().split(NEWLINE_REGEXP);
    const tokensByLine = [];

    let ruleStack = null;

    for (let i = 0, len = lines.length; i < len; i++) {
        const line = lines[i];
        if (line === '') {
            tokensByLine.push([]);
            continue;
        }

        const result = grammar.tokenizeLine2(line, ruleStack);
        const tokensLength = result.tokens.length >> 1;
        const tokens = [];

        const tokensWithScopes = options.includeExplanations ?
            grammar.tokenizeLine(line, ruleStack).tokens :
            null;
        let tokensWithScopesIndex = 0;

        for (let j = 0; j < tokensLength; j++) {
            const startIndex = result.tokens[j * 2];
            const nextStartIndex = j + 1 < tokensLength ? result.tokens[j * 2 + 2] : line.length;
            const tokenText = line.substring(startIndex, nextStartIndex);
            if (tokenText === '') {
                continue;
            }

            const metadata = result.tokens[2 * j + 1];
            const foreground = EncodedTokenAttributes.getForeground(metadata);
            const fontStyle = EncodedTokenAttributes.getFontStyle(metadata);
            const token = {
                content: tokenText,
                color: colorMap[foreground],
                fontStyle,
            };

            if (tokensWithScopes) {
                const explanations = [];
                let offset = 0;

                while (startIndex + offset < nextStartIndex) {
                    const tokenWithScopes = tokensWithScopes[tokensWithScopesIndex];
                    const tokenWithScopesText = line.substring(
                        tokenWithScopes.startIndex,
                        tokenWithScopes.endIndex,
                    );
                    explanations.push({
                        content: tokenWithScopesText,
                        scopes: tokenWithScopes.scopes,
                    });
                    offset += tokenWithScopesText.length;
                    tokensWithScopesIndex++;
                }
                token.explanations = explanations;
            }

            tokens.push(token);
        }

        tokensByLine.push(tokens);
        ruleStack = result.ruleStack;
    }

    return tokensByLine;
}
