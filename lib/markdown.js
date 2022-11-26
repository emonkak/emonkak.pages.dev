import fs from 'node:fs/promises';
import probe from 'probe-image-size';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import yaml from 'yaml';
import { read } from 'to-vfile';
import { toString as mdastToString } from 'mdast-util-to-string';
import { toText as hastToText } from 'hast-util-to-text';
import { u } from 'unist-builder';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { createHighlightTree, createRegistry } from './highlight.js';

const CAPTION_MAKER = 'Caption:';
const NOTE_PATTERN = /^(Note|Warning|Callout):$/;

export async function parseMarkdown(srcPath) {
    return await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkFigure)
        .use(remarkNote)
        .use(remarkFrontmatter, ['yaml'])
        .use(remarkExtractFrontmatter)
        .use(remarkExtractSections)
        .use(remarkRehype, {
            allowDangerousHtml: true,
        })
        .use(rehypeImage)
        .use(rehypeTextmateHighlight)
        .use(nullCompiler)
        .process(await read(srcPath));
}

function remarkFigure() {
    const test = [
        { type: 'code' },
        { type: 'paragraph' },
        { type: 'table' },
    ];
    return (tree, _file) => {
        visit(tree, test, (node, index, parent) => {
            if (node.type === 'paragraph' &&
                !(node.children.length === 1 && node.children[0].type === 'image')) {
                return;
            }

            const captionChildren = [];
            const nextSibling = parent.children[index + 1];

            if (nextSibling && isCaptionMaker(nextSibling)) {
                captionChildren.push(...nextSibling.children.slice(1));
                parent.children.splice(index + 1, 1);
            } else if (node.type === 'code') {
                if (node.meta) {
                    captionChildren.push(u('text', node.meta));
                }
            } else if (node.type === 'paragraph') {
                const firstChild = node.children[0];
                if (firstChild.title) {
                    captionChildren.push(u('text', firstChild.title));
                }
            }

            const content = node.type === 'paragraph' ? node.children[0] : node;
            const figure = createMdastCustomNode('figure', 'figure', {
                class: ['figure', 'is-' + content.type],
            }, []);

            figure.children.push(createMdastCustomNode('figBody', 'div', {
                class: ['figure-body'],
            }, [content]));

            if (captionChildren.length > 0) {
                trimTextNode(captionChildren[0]);
                const caption = createMdastCustomNode('figCaption', 'figcaption', {
                    class: ['figure-caption'],
                }, captionChildren);
                figure.children.push(caption);
            }

            parent.children[index] = figure;
        });
    };
}

function remarkNote() {
    const test = [
        { type: 'blockquote' },
    ];
    return (tree, _file) => {
        visit(tree, test, (node, index, parent) => {
            const firstChild = node.children[0];

            if (firstChild && isNoteMaker(firstChild)) {
                const maker = firstChild.children[0];
                const variant = mdastToString(maker).toLowerCase().slice(0, -1);
                const captionChildren = firstChild.children.slice(1);

                if (captionChildren[0]) {
                    trimTextNode(captionChildren[0]);
                }

                const note = createMdastCustomNode('note', 'aside', {
                    class: ['note', 'is-' + variant],
                }, []);

                if (captionChildren.length > 0) {
                    const caption = createMdastCustomNode('noteCaption', 'div', {
                        class: ['note-caption'],
                    }, captionChildren);
                    note.children.push(caption);
                }

                note.children.push(createMdastCustomNode('noteBody', 'div', {
                    class: ['note-body'],
                }, node.children.slice(1)));

                parent.children[index] = note;
            }
        });
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

function rehypeImage() {
    return async (tree, file) => {
        const nodes = [];

        visit(tree, { type: 'element', tagName: 'img' }, (node, _index, _parent) => {
            nodes.push(node);
        });

        for (const node of nodes) {
            if (node.properties.src) {
                const baseUrl = 'file://' + file.path;
                const imageUrl = new URL(node.properties.src, baseUrl);
                if (imageUrl.protocol === 'file:') {
                    const stream = (await fs.open(imageUrl.pathname)).createReadStream();
                    const dimension = await probe(stream);
                    Object.assign(node.properties, {
                        width: dimension.width,
                        height: dimension.height,
                    });
                }
            }
        }
    };
}

function rehypeTextmateHighlight() {
    return async (tree, file) => {
        const registry = createRegistry();
        const nodes = [];

        visit(tree, { type: 'element', tagName: 'pre' }, (node, _index, _parent) => {
            const firstChild = node.children[0];
            const language = firstChild && detectCodeLanguageFromNode(firstChild);
            if (!language) {
                return;
            }
            nodes.push({ node, language });
        });

        for (const { node, language } of nodes) {
            let grammar;

            try {
                grammar = await registry.loadGrammar('source.' + language)
                    .catch(() => registry.loadGrammar('text.' + language))
                    .catch(() => registry.loadGrammar(language));
            } catch (error) {
                file.fail(error, node, 'rehypeTextmateHighlight:missingGrammar');
                return;
            }

            const text = hastToText(node, { whitespace: 'pre' });
            const highlightNode = createHighlightTree(text, grammar);

            node.children = [highlightNode];
            Object.assign(node.properties ??= {}, {
                'data-scope': grammar._rootScopeName,
            });
        }
    };
}

function nullCompiler() {
    this.Compiler = function(tree, file) {
        file.data.tree = tree;
        return '';
    };
}

function detectCodeLanguageFromNode(node) {
    if (node.type === 'element' && node.tagName === 'code') {
        const className = node.properties?.className;
        if (Array.isArray(className)) {
            for (const name of className) {
                if (name.startsWith('language-')) {
                    return name.slice(9);
                }
            }
        }
    }
    return null;
}

function createMdastCustomNode(type, name, props, children) {
    return u(type, {
        data: {
            hName: name,
            hProperties: props,
        },
    }, children);
}

function isCaptionMaker(node) {
    return node.type === 'paragraph'
        && node.children.length > 0
        && node.children[0].type === 'strong'
        && node.children[0].children.length === 1
        && exactTextNode(node.children[0].children[0], CAPTION_MAKER);
}

function isNoteMaker(node) {
    return node.type === 'paragraph'
        && node.children.length > 0
        && node.children[0].type === 'strong'
        && node.children[0].children.length === 1
        && matchTextNode(node.children[0].children[0], NOTE_PATTERN);
}

function exactTextNode(node, text) {
    return node.type === 'text' && node.value === text;
}

function matchTextNode(node, pattern) {
    return node.type === 'text' && node.value.match(pattern);
}

function trimTextNode(node) {
    if (node.type === 'text') {
        node.value = node.value.trim();
    }
}
