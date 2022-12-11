import fs from 'node:fs/promises';
import probe from 'probe-image-size';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeExternalLinks from 'rehype-external-links';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import yaml from 'yaml';
import { filter } from 'unist-util-filter';
import { fromHtml } from 'hast-util-from-html';
import { read } from 'to-vfile';
import { toString as mdastToString } from 'mdast-util-to-string';
import { toText as hastToText } from 'hast-util-to-text';
import { u } from 'unist-builder';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { createHighlightTree, createTextmateRegistry } from './highlight.js';
import { BASE_URL } from './constants.js';

const CAPTION_MAKER = 'Caption:';
const NOTE_PATTERN = /^(Note|Warning|Callout):$/;
const STRIP_SPACE_PATTERN = /\s*\n\s*/gm;

export async function parseMarkdown(srcPath, textmateRegistry, graphviz) {
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
        .use(rehypeExternalLinks, { target: '_blank', rel: [] })
        .use(rehypeImage)
        .use(rehypeGraphviz, { graphviz })
        .use(rehypeTextmateHighlight, { registry: textmateRegistry })
        .use(nullCompiler)
        .process(await read(srcPath));
}

function remarkFigure() {
    const test = [
        { type: 'blockquote' },
        { type: 'code' },
        { type: 'paragraph' },
        { type: 'table' },
    ];
    return (tree, _file) => {
        visit(tree, test, (node, index, parent) => {
            let caption = [];

            if (node.type === 'code') {
                if (node.meta) {
                    caption.push(u('text', node.meta));
                }
            } else if (node.type === 'paragraph') {
                if (!hasOnlyChildOfType(node, 'image')) {
                    return;
                }
                node = node.children[0];
                if (node.title) {
                    caption.push(u('text', node.title));
                }
            } else if (node.type === 'blockquote') {
                if (hasOnlyChildOfType(node, 'paragraph') && hasOnlyChildOfType(node.children[0], 'link')) {
                    node = node.children[0].children[0];
                    const url = new URL(node.url, BASE_URL);
                    const favicon = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
                    Object.assign(node.data ??= {}, {
                        hProperties: {
                            'style': `--favicon: url(${encodeURI(favicon)})`,
                            'data-domain': url.hostname,
                        },
                    });
                    if (node.title) {
                        caption.push(u('text', node.title));
                    }
                }
            }

            const nextSibling = parent.children[index + 1];
            if (nextSibling && isCaptionMaker(nextSibling)) {
                caption = nextSibling.children.slice(1);
                parent.children.splice(index + 1, 1);
            }

            const type = node.type === 'code' && node.lang === 'dot' ? 'image' : node.type;
            const figure = createMdastCustomNode('figure', 'figure', {
                'class': ['figure', 'is-' + type],
                'data-language': node.type === 'code' && node.lang,
            }, []);

            figure.children.push(createMdastCustomNode('figBody', 'div', {
                class: ['figure-body'],
            }, [node]));

            if (caption.length > 0) {
                trimTextNode(caption[0]);
                figure.children.push(createMdastCustomNode('figCaption', 'figcaption', {
                    class: ['figure-caption'],
                }, caption));
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
                const caption = firstChild.children.slice(1);

                const note = createMdastCustomNode('note', 'aside', {
                    class: ['note', 'is-' + variant],
                }, []);

                if (caption.length > 0) {
                    trimTextNode(caption[0]);
                    note.children.push(createMdastCustomNode('noteCaption', 'div', {
                        class: ['note-caption'],
                    }, caption));
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

function rehypeGraphviz(options) {
    const { graphviz } = options;

    return (tree, _file) => {
        visit(tree, { type: 'element', tagName: 'pre' }, (node, index, parent) => {
            const firstChild = node.children[0];
            const language = firstChild && detectCodeLanguageFromNode(firstChild);
            if (language !== 'dot') {
                return;
            }

            const dotString = mdastToString(node);
            const svgString = graphviz.dot(dotString).replaceAll(STRIP_SPACE_PATTERN, '');

            let svg = fromHtml(svgString, { space: 'svg' });
            svg = filter(svg, (node) => {
                if (node.type === 'comment') {
                    return false;
                }

                if (node.type === 'element') {
                    if (node.tagName === 'title') {
                        return false;
                    }
                    if (node.properties) {
                        delete node.properties.id;
                        delete node.properties.className;
                    }
                }

                return true;
            });

            parent.children[index] = svg;
        });
    };
}

function rehypeTextmateHighlight(options) {
    const registry = options.registry ?? createTextmateRegistry();

    return async (tree, file) => {
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
    return node.type === 'paragraph' &&
        node.children.length > 0 &&
        node.children[0].type === 'strong' &&
        node.children[0].children.length === 1 &&
        exactTextNode(node.children[0].children[0], CAPTION_MAKER);
}

function isNoteMaker(node) {
    return node.type === 'paragraph' &&
        node.children.length > 0 &&
        node.children[0].type === 'strong' &&
        node.children[0].children.length === 1 &&
        matchTextNode(node.children[0].children[0], NOTE_PATTERN);
}

function hasOnlyChildOfType(node, type) {
    return node.children.length === 1 &&
        node.children[0].type === type;
}

function exactTextNode(node, text) {
    return node.type === 'text' && node.value === text;
}

function matchTextNode(node, pattern) {
    return node.type === 'text' && node.value.match(pattern);
}

function trimTextNode(node) {
    if (node.type === 'text') {
        node.value = node.value.trimStart();
    }
}
