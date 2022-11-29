import fs from 'node:fs/promises';
import oniguruma from 'vscode-oniguruma';
import textmate from 'vscode-textmate';
import { h } from 'hastscript';
import { u } from 'unist-builder';

import availableGrammars from './grammars/index.js';

const NEWLINE_REGEXP = /\r?\n|\r/g;

export function createRegistry() {
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

export function createHighlightTree(text, grammar) {
    const rootScope = unstableGetScopeNameFromGrammar(grammar);
    const root = h('code', {
        class: scopeToClassNames(rootScope),
    });
    const scopeStack = [];
    const termination = text.length;

    let currentNode = root;
    let start = 0;
    let ruleStack = textmate.INITIAL;

    while (start < termination) {
        const match = NEWLINE_REGEXP.exec(text);
        const end = match ? match.index : termination;

        if (start !== end) {
            const line = text.slice(start, end);
            const { tokens, ruleStack: nextRuleStack } = grammar.tokenizeLine(line, ruleStack);
            for (const token of tokens) {
                const scopes = token.scopes.slice(1);
                for (let i = 0, l = scopeStack.length; i < l; i++) {
                    if (scopeStack[i].scope !== scopes[i]) {
                        currentNode = scopeStack.splice(i)[0].node;
                        break;
                    }
                }
                for (let i = scopeStack.length, l = scopes.length; i < l; i++) {
                    const scope = scopes[i];
                    const child = h('span', {
                        class: scopeToClassNames(scope),
                    });
                    scopeStack.push({ scope, node: currentNode });
                    currentNode.children.push(child);
                    currentNode = child;
                }
                const textNode = u('text', line.substring(token.startIndex, token.endIndex));
                currentNode.children.push(textNode);
            }
            ruleStack = nextRuleStack;
        }

        start = end;

        if (match) {
            const newline = match[0];
            const lastChild = currentNode.children[currentNode.children.length - 1];
            if (lastChild && lastChild.type === 'text') {
                lastChild.value += newline;
            } else {
                const textNode = u('text', newline);
                currentNode.children.push(textNode);
            }
            start += newline.length;
        }
    }

    return root;
}

function unstableGetScopeNameFromGrammar(grammar) {
    return grammar._rootScopeName;
}

function scopeToClassNames(scope) {
    const components = scope.split('.');
    const classNames = ['token'];
    for (const component of components) {
        const className = 'is-' + component;
        classNames.push(className);
    }
    return classNames;
}
