import fs from 'node:fs/promises';
import path from 'node:path';
import probe from 'probe-image-size';
import rehypeExternalLinks from 'rehype-external-links';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import vega from 'vega';
import vegaLite from 'vega-lite';
import yaml from 'yaml';
import { Graphviz } from '@hpcc-js/wasm/graphviz';
import { filter } from 'unist-util-filter';
import { fromHtml } from 'hast-util-from-html';
import { read } from 'to-vfile';
import { toString as mdastToString } from 'mdast-util-to-string';
import { toText as hastToText } from 'hast-util-to-text';
import { u } from 'unist-builder';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { BASE_URL } from './constants.js';
import { MathJax } from './math.js';
import { createHighlightTree, createTextmateRegistry } from './highlight.js';

const CAPTION_PATTERN = /^Caption:$/;
const NOTE_PATTERN = /^(Note|Warning|Callout):$/;
const SPACE_PATTERN = /^\s*$/g;

const IMAGE_CODE_LANGUAGES = ['dot', 'vega', 'vega-lite'];

const VEGA_LITE_CONFIG = {
    background: '#ffffff',
    range: {
        category: [
            '#8190b3',  // gray-6
            '#f25d46',  // red-6
            '#5f8dfa',  // blue-6
            '#c97c24',  // yellow-6
            '#1f9fa3',  // cyan-6
            '#a877fc',  // violet-6
        ],
    },
};

export class MarkdownParser {
    static async init() {
        const textmateRegistry = createTextmateRegistry();
        const graphviz = await Graphviz.load();
        const mathjax = new MathJax();
        return new MarkdownParser(textmateRegistry, graphviz, mathjax);
    }

    constructor(textmateRegistry, graphviz, mathjax) {
        this.textmateRegistry = textmateRegistry;
        this.graphviz = graphviz;
        this.mathjax = mathjax;
    }

    async parse(srcPath) {
        return await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkMath)
            .use(remarkNote)
            .use(remarkFigure)
            .use(remarkMathjax, { mathjax: this.mathjax })
            .use(remarkFrontmatter, ['yaml'])
            .use(remarkExtractFrontmatter)
            .use(remarkExtractSections)
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypeExternalLinks, { target: '_blank', rel: [] })
            .use(rehypeImageSize)
            .use(rehypeVega)
            .use(rehypeGraphviz, { graphviz: this.graphviz })
            .use(rehypeTextmateHighlight, { registry: this.textmateRegistry })
            .use(nullCompiler)
            .process(await read(srcPath));
    }
}

function remarkNote() {
    return (tree, _file) => {
        visit(tree, { type: 'blockquote' }, (node, index, parent) => {
            const firstChild = node.children[0];

            if (firstChild && isMakerNode(firstChild, NOTE_PATTERN)) {
                const maker = firstChild.children[0];
                const variant = mdastToString(maker).toLowerCase().slice(0, -1);
                const captionChildren = firstChild.children.slice(1);

                const note = u('note', {
                    data: {
                        hName: 'aside',
                        hProperties: {
                            class: ['note', 'is-' + variant],
                        },
                    },
                }, []);

                if (captionChildren.length > 0) {
                    trimTextNode(captionChildren[0]);
                    note.children.push(u('noteCaption', {
                        data: {
                            hName: 'div',
                            hProperties: {
                                class: ['note-caption'],
                            },
                        },
                    }, captionChildren));
                }

                note.children.push(u('noteBody', {
                    data: {
                        hName: 'div',
                        hProperties: {
                            class: ['note-body'],
                        },
                    },
                }, node.children.slice(1)));

                parent.children[index] = note;
            }
        });
    };
}

function remarkFigure() {
    const test = [
        { type: 'blockquote' },
        { type: 'code' },
        { type: 'math' },
        { type: 'paragraph' },
        { type: 'table' },
    ];
    return (tree, _file) => {
        visit(tree, test, (node, index, parent) => {
            let captionChildren = [];

            if (node.type === 'code' || node.type === 'math') {
                if (node.meta) {
                    captionChildren.push(u('text', node.meta));
                }
            } else if (node.type === 'paragraph') {
                if (!hasOnlyChildOfType(node, 'image')) {
                    return;
                }
                node = node.children[0];
                if (node.title) {
                    captionChildren.push(u('text', node.title));
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
                        captionChildren.push(u('text', node.title));
                    }
                }
            }

            const nextSibling = parent.children[index + 1];
            if (nextSibling && isMakerNode(nextSibling, CAPTION_PATTERN)) {
                captionChildren = nextSibling.children.slice(1);
                parent.children.splice(index + 1, 1);
            }

            const type = (node.type === 'code' && IMAGE_CODE_LANGUAGES.includes(node.lang)) ?
                'image' :
                node.type;
            const figure = u('figure', {
                data: {
                    hName: 'figure',
                    hProperties: {
                        'class': ['figure', 'is-' + type],
                        'data-language': node.type === 'code' && node.lang,
                    },
                },
            }, []);

            figure.children.push(u('figureBody', {
                data: {
                    hName: 'div',
                    hProperties: {
                        class: ['figure-body'],
                    },
                },
            }, [node]));

            if (captionChildren.length > 0) {
                trimTextNode(captionChildren[0]);
                figure.children.push(u('figureCaption', {
                    data: {
                        hName: 'figcaption',
                        hProperties: {
                            class: ['figure-caption'],
                        },
                    },
                }, captionChildren));
            }

            parent.children[index] = figure;
        });
    };
}

function remarkMathjax(options) {
    const { mathjax } = options;
    const test = [
        { type: 'math' },
        { type: 'inlineMath' },
    ];

    return (tree, _file) => {
        visit(tree, test, (node, _index, _parent) => {
            const input = mdastToString(node);
            const svgString = mathjax.convertToSvg(input);
            const svgRoot = cleanSvg(svgString);
            const title = u('element', { tagName: 'title' }, [u('text', input)]);

            node.data = {
                hName: svgRoot.children[0].tagName,
                hProperties: {
                    ...node.data.hProperties,
                    ...svgRoot.children[0].properties,
                },
                hChildren: [title, ...svgRoot.children[0].children],
            };
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
        const root = { children: [], index: 0 };
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

            section.index = currentSection.children.length;
            section.id = 'section-' + [
                ...sectionStack.slice(1).map((section) => section.index + 1),
                section.index + 1,
            ].join('-');

            Object.assign(node.data ??= {}, {
                hProperties: { id: section.id },
            });

            currentSection.children.push(section);
            currentSection = section;
            currentDepth = depth;
        });

        file.data.sections = root.children;
    };
}

function rehypeImageSize() {
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

            const input = mdastToString(node);
            const output = graphviz.dot(input);
            const svgRoot = cleanSvg(output);

            parent.children[index] = svgRoot;
        });
    };
}

function rehypeVega(options = {}) {
    const scale = options.scale ?? 2.0;

    return async (tree, file) => {
        const nodes = [];

        visit(tree, { type: 'element', tagName: 'pre' }, (node, index, parent) => {
            const firstChild = node.children[0];
            const language = firstChild && detectCodeLanguageFromNode(firstChild);
            if (language === 'vega' || language === 'vega-lite') {
                nodes.push({ node, index, parent, language });
            }
        });

        for (const { node, index, parent, language } of nodes) {
            const jsonString = mdastToString(node).trim();

            let spec;
            try {
                spec = JSON.parse(jsonString);
            } catch (error) {
                file.fail(error, node, 'rehypeVega:JsonParseError');
                return;
            }

            if (language === 'vega-lite') {
                try {
                    spec = vegaLite.compile(spec, {
                        config: VEGA_LITE_CONFIG,
                    }).spec;
                } catch (error) {
                    file.fail(error, node, 'rehypeVega:compileError');
                    return;
                }
            }

            const runtime = vega.parse(spec);
            const loader = vega.loader({ baseURL: path.dirname(file.path) });
            const view = new vega.View(runtime)
                .loader(loader)
                .renderer('none')
                .finalize();
            const svgString = await view.toSVG(scale);
            const svgRoot = cleanSvg(svgString);

            parent.children[index] = svgRoot;
        }
    };
}

function rehypeTextmateHighlight(options) {
    const { registry } = options;

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

function isMakerNode(node, pattern) {
    return node.type === 'paragraph' &&
        node.children.length > 0 &&
        node.children[0].type === 'strong' &&
        node.children[0].children.length === 1 &&
        matchTextNode(node.children[0].children[0], pattern);
}

function matchTextNode(node, pattern) {
    return node.type === 'text' && node.value.match(pattern);
}

function hasOnlyChildOfType(node, type) {
    return node.children.length === 1 &&
        node.children[0].type === type;
}

function trimTextNode(node) {
    if (node.type === 'text') {
        node.value = node.value.trimStart();
    }
}

function cleanSvg(svgString) {
    const node = fromHtml(svgString, {
        fragment: true,
        space: 'svg',
    });
    return filter(node, (node) => {
        if (node.type === 'comment') {
            return false;
        }

        if (node.type === 'text' && SPACE_PATTERN.test(node.value)) {
            return false;
        }

        if (node.type === 'element') {
            if (node.properties) {
                delete node.properties.id;
                delete node.properties.className;

                for (const key in node.properties) {
                    if (key.startsWith('data')) {
                        delete node.properties[key];
                    }
                }
            }
        }

        return true;
    });
}
