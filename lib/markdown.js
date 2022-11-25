import { toText as hastToText } from 'hast-util-to-text';
import { toString as mdastToString } from 'mdast-util-to-string';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import yaml from 'yaml';

import { createHighlightTree, createRegistry } from './highlight.js';

export function parseMarkdown(text) {
    return unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkFrontmatter, ['yaml'])
        .use(remarkExtractFrontmatter)
        .use(remarkExtractSections)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeTextmateHighlight)
        .use(nullCompiler)
        .process(text);
}

function rehypeTextmateHighlight(options = {}) {
    const { include, exclude } = options;
    let { registry } = options;

    if (!registry) {
        registry = createRegistry();
    }

    return async (tree, file) => {
        const codeNodes = [];

        visit(tree, 'element', (node, _index, parent) => {
            if (!parent ||
                parent.tagName !== 'pre' ||
                node.tagName !== 'code') {
                return;
            }

            const language = detectLanguageFromNode(node);

            if (!language ||
                (include && !include.includes(language)) ||
                (exclude && exclude.includes(language))) {
                return;
            }

            codeNodes.push([node, parent, language]);
        });

        for (const [node, parent, language] of codeNodes) {
            const scopeName = scopeNameFromLanguage(language);
            let grammar;

            try {
                grammar = await registry.loadGrammar(scopeName);
            } catch (error) {
                file.fail(error, node, 'rehypeTextmateHighlight:missingGrammar');
                return;
            }

            const text = hastToText(node, { whitespace: 'pre' });
            const highlightNode = createHighlightTree(text, grammar);
            node.children = highlightNode.children;

            const props = (node.properties ??= {});
            Object.assign(props, highlightNode.properties);

            addClass(parent, 'hl-block');
            addProp(parent, 'data-language', language);
        }
    };
}

function remarkExtractSections() {
    return (tree, file) => {
        const root = { children: [] };
        const sectionStack = [];
        let currentSection = root;
        let currentDepth = 0;

        visit(tree, 'heading', (node, _index, _parent) => {
            const depth = node.depth;
            const section = {
                heading: mdastToString(node),
                depth,
                children: [],
            };

            if (depth > currentDepth) {
                sectionStack.push(currentSection);
            } else {
                if (depth < currentDepth) {
                    sectionStack.pop();
                }
                currentSection = sectionStack[sectionStack.length - 1];
            }

            currentSection.children.push(section);
            currentSection = section;
            currentDepth = depth;
        });

        file.data.sections = root.children;
    };
}

function remarkExtractFrontmatter() {
    return (tree, file) => {
        visit(tree, 'yaml', (node, _index, _parent) => {
            try {
                file.data.matter = yaml.parse(node.value);
            } catch (error) {
                file.fail(error, node, 'remarkExtractFrontmatter:yamlParseError');
            }
        });
    };
}

function nullCompiler() {
    this.Compiler = function Compiler(tree, file) {
        file.data.tree = tree;
        return '';
    };
}

function addClass(node, additionalClassName) {
    const props = (node.properties ??= {});
    const className = (props.className ??= []);
    className.push(additionalClassName);
}

function addProp(node, name, value) {
    const props = (node.properties ??= {});
    props[name] = value;
}

function scopeNameFromLanguage(lang) {
    return 'source.' + lang;
}

function detectLanguageFromNode(node) {
    const className = node.properties?.className;

    if (Array.isArray(className)) {
        for (const name of className) {
            if (name.startsWith('language-')) {
                return name.slice(9);
            }
        }
    }

    return null;
}
