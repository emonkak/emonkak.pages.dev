import fs from 'node:fs/promises';
import path from 'node:path';
import probe from 'probe-image-size';
import rehypeExternalLinks from 'rehype-external-links';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype, { all } from 'remark-rehype';
import vega from 'vega';
import vegaLite from 'vega-lite';
import yaml from 'yaml';
import { Graphviz } from '@hpcc-js/wasm/graphviz';
import { filter } from 'unist-util-filter';
import { fromHtml } from 'hast-util-from-html';
import { normalizeUri } from 'micromark-util-sanitize-uri';
import { read } from 'to-vfile';
import { toString as mdastToString } from 'mdast-util-to-string';
import { toText as hastToText } from 'hast-util-to-text';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { visitParents } from 'unist-util-visit-parents';

import { BASE_URL } from './constants.js';
import { FontStyle } from './encodedTokenAttributes.js';
import { MathJax } from './math.js';
import { tokenizeWithTheme, createTextmateRegistry } from './highlight.js';
import colors from './colors.js';

const CAPTION_PATTERN = /^Caption:$/;
const NOTE_PATTERN = /^(Note|Warning|Callout):$/;
const SPACE_PATTERN = /^\s*$/g;

const IMAGE_CODE_LANGUAGES = ['dot', 'vega', 'vega-lite'];

const TEXTMATE_THEME = {
    settings: [
        {
            settings: {
                foreground: colors.gray_1,
            },
        },
        {
            scope: [
                'meta.embedded',
            ],
            settings: {
                foreground: colors.gray_1,
            },
        },
        {
            scope: [
                'comment',
                'meta.preprocessor',
            ],
            settings: {
                foreground: colors.gray_5,
                fontStyle: 'italic',
            },
        },
        {
            scope: [
                'constant.language',
                'constant.numeric',
                'markup.deleted',
                'punctuation.definition.string',
                'punctuation.definition.escape',
                'string.interpolated',
                'string.quoted',
                'string.regexpr',
                'string.template',
                'string.unquoted.heredoc',
            ],
            settings: {
                foreground: colors.red_5,
            },
        },
        {
            scope: [
                'entity.name.type',
                'entity.other.inherited-class',
                'markup.inserted',
                'storage.type',
                'support.class',
                'support.other.namespace',
                'support.type',
            ],
            settings: {
                foreground: colors.cyan_5,
            },
        },
        {
            scope: [
                'entity.name.function',
                'punctuation.definition.tag',
                'support.function',
            ],
            settings: {
                foreground: colors.blue_5,
            },
        },
        {
            scope: [
                'constant.other',
                'entity.other.attribute',
                'entity.other.attribute-name',
                'meta.diff.range',
                'support.variable',
                'variable.other.php',
            ],
            settings: {
                foreground: colors.violet_5,
            },
        },
        {
            scope: [
                'entity.name.tag',
                'keyword.control',
                'keyword.local',
                'keyword.operator',
                'keyword.other',
                'meta.diff.header',
                'meta.diff.index',
                'punctuation.definition.lifetime',
                'punctuation.definition.logical-expression',
                'punctuation.definition.option',
                'punctuation.definition.property',
                'punctuation.definition.variable',
                'punctuation.separator.statement',
                'punctuation.section.embedded',
                'storage.function',
                'storage.modifier',
                'storage.type.let',
                'storage.type.class',
                'storage.type.const',
                'storage.type.function',
                'storage.type.interface',
                'storage.type.js',
            ],
            settings: {
                foreground: colors.yellow_5,
            },
        },
    ],
};

const VEGA_LITE_CONFIG = {
    font: 'inherit',
    background: '#ffffff',
    range: {
        category: [
            colors.gray_6,
            colors.red_6,
            colors.blue_6,
            colors.yellow_6,
            colors.cyan_6,
            colors.violet_6,
        ],
    },
};

export class MarkdownParser {
    static async create(env) {
        const textmateRegistry = createTextmateRegistry(TEXTMATE_THEME);
        const graphviz = await Graphviz.load();
        const mathjax = new MathJax();
        return new MarkdownParser(textmateRegistry, graphviz, mathjax, env);
    }

    constructor(textmateRegistry, graphviz, mathjax, env) {
        this.textmateRegistry = textmateRegistry;
        this.graphviz = graphviz;
        this.mathjax = mathjax;
        this.env = env;
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
            .use(remarkRehype, {
                allowDangerousHtml: true,
                handlers: { footnoteDefinition },
            })
            .use(rehypeEraseFooter)
            .use(rehypeExternalLinks, { target: '_blank', rel: [] })
            .use(rehypeImageSize)
            .use(rehypeVega)
            .use(rehypeGraphviz, { graphviz: this.graphviz })
            .use(rehypeTextmateHighlight, {
                registry: this.textmateRegistry,
                includeExplanations: this.env === 'development',
            })
            .use(nullCompiler)
            .process(await read(srcPath));
    }
}

function createTokenNode(token) {
    const textNode = { type: 'text', value: token.content };

    if (SPACE_PATTERN.test(token.content)) {
        return textNode;
    }

    const styles = [];
    const node = {
        type: 'element',
        tagName: 'span',
        properties: {},
        children: [textNode],
    };

    if (token.explanations) {
        node.properties['title'] = JSON.stringify(token.explanations, null, 2);
    }

    if (token.color) {
        styles.push(`color:${token.color}`);
    }

    if (token.fontStyle) {
        if (token.fontStyle & FontStyle.Bold) {
            styles.push('font-weight:bold');
        }
        if (token.fontStyle & FontStyle.Italic) {
            styles.push('font-style:italic');
        }
    }

    if (styles.length > 0) {
        node.properties.style = styles.join(';');
    }

    return node;
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

function footnoteDefinition(h, node) {
    const id = String(node.identifier);
    const safeId = normalizeUri(id.toLowerCase());
    const footnoteIndex = h.footnoteOrder.indexOf(id);

    const referenceCount = h.footnoteCounts[id];
    const backReferences = [];

    for (let referenceIndex = 0; referenceIndex < referenceCount; referenceIndex++) {
        const backReference = {
            type: 'element',
            tagName: 'a',
            properties: {
                href:
                    '#' +
                    h.clobberPrefix +
                    'fnref-' +
                    safeId +
                    (referenceIndex > 0 ? '-' + (referenceIndex + 1) : ''),
                ariaLabel: h.footnoteBackLabel,
                class: 'footnote-back-reference',
            },
            children: [
                {
                    type: 'text',
                    value: '[' + (footnoteIndex + 1) + (referenceCount > 1 ? '.' + (referenceIndex + 1) : '') + ']',
                },
            ],
        };

        if (backReferences.length > 0) {
            backReferences.push({ type: 'text', value: ' ' });
        }

        backReferences.push(backReference);
    }

    const content = all(h, node);

    return {
        type: 'element',
        tagName: 'aside',
        properties: {
            id: h.clobberPrefix + 'fn-' + safeId,
            class: 'footnote',
        },
        children: [
            {
                type: 'element',
                tagName: 'div',
                properties: {
                    class: 'footnote-label',
                },
                children: backReferences,
            },
            {
                type: 'element',
                tagName: 'div',
                properties: {
                    class: 'footnote-body',
                },
                children: content,
            },
        ],
    };
}

function hasOnlyChildOfType(node, type) {
    return node.children.length === 1 &&
        node.children[0].type === type;
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

function normalizeLanguageName(language) {
    if (language === 'php') {
        return 'PHP';
    }
    return language.replace(/\s*\(.*\)\s*/, '');
}

function nullCompiler() {
    this.Compiler = function(tree, file) {
        file.data.tree = tree;
        return '';
    };
}

function parseSvg(input) {
    const node = fromHtml(input, {
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

function rehypeEraseFooter() {
    return (tree, _file) => {
        const test = { type: 'element', tagName: 'section' };

        visit(tree, test, (node, index, parent) => {
            if (node.properties.dataFootnotes) {
                parent.children.splice(index, 1);
            }
        });
    };
}

function rehypeGraphviz(options) {
    const { graphviz } = options;

    return (tree, _file) => {
        const test = { type: 'element', tagName: 'pre' };

        visit(tree, test, (node, index, parent) => {
            const firstChild = node.children[0];
            const language = firstChild && detectCodeLanguageFromNode(firstChild);
            if (language !== 'dot') {
                return;
            }

            const input = mdastToString(node);
            const output = graphviz.dot(input);
            const svg = parseSvg(output);

            unsetGraphvizDefaultFontFamily(svg);

            parent.children[index] = svg;
        });
    };
}

function rehypeImageSize() {
    return async (tree, file) => {
        const nodes = [];
        const test = { type: 'element', tagName: 'img' };

        visit(tree, test, (node, _index, _parent) => {
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

function rehypeTextmateHighlight(options) {
    const { registry, includeExplanations } = options;

    return async (tree, file) => {
        const nodes = [];
        const test = { type: 'element', tagName: 'pre' };
        const colorMap = registry.getColorMap();

        visitParents(tree, test, (node, ancestors) => {
            const firstChild = node.children[0];
            const language = firstChild && detectCodeLanguageFromNode(firstChild);
            if (!language) {
                return;
            }
            nodes.push({ node, language, ancestors });
        });

        for (const { node, language, ancestors } of nodes) {
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
            const tokensByLine = tokenizeWithTheme(text, grammar, colorMap, {
                includeExplanations,
            });
            const codeElement = {
                type: 'element',
                tagName: 'code',
                children: tokensByLine.flatMap((tokens) => [
                    ...tokens.map(createTokenNode),
                    { type: 'text', value: '\n' },
                ]),
            };

            const figure = ancestors[ancestors.length - 2];

            if (figure && figure.type === 'element' && figure.tagName === 'figure') {
                figure.properties = {
                    'data-language': normalizeLanguageName(grammar?._grammar?.name ?? language),
                    ...figure.properties,
                };
            }

            node.children = [codeElement];
        }
    };
}

function rehypeVega(options = {}) {
    const scale = options.scale ?? 2.0;

    return async (tree, file) => {
        const nodes = [];
        const test = { type: 'element', tagName: 'pre' };

        visit(tree, test, (node, index, parent) => {
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
            const svg = parseSvg(svgString);

            parent.children[index] = svg;
        }
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

            if (node.type === 'code') {
                if (node.meta) {
                    captionChildren.push({ type: 'text', value: node.meta });
                }
                if (node.lang === 'raw') {
                    node = { type: 'html', value: mdastToString(node) };
                }
            } else if (node.type === 'math') {
                if (node.meta) {
                    captionChildren.push({ type: 'text', value: node.meta });
                }
            } else if (node.type === 'paragraph') {
                if (!hasOnlyChildOfType(node, 'image')) {
                    return;
                }
                node = node.children[0];
                if (node.title) {
                    captionChildren.push({ type: 'text', value: node.title });
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
                        captionChildren.push({ type: 'text', value: node.title });
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
            const figure = {
                type: 'figure',
                data: {
                    hName: 'figure',
                    hProperties: {
                        'class': ['figure', 'is-' + type],
                    },
                },
                children: [],
            };

            if (node.type === 'image') {
                node = {
                    type: 'link',
                    url: node.url,
                    children: [node],
                };
            }

            figure.children.push({
                type: 'figureBody',
                data: {
                    hName: 'div',
                    hProperties: {
                        class: ['figure-body'],
                    },
                },
                children: [node],
            });

            if (captionChildren.length > 0) {
                trimTextNode(captionChildren[0]);
                figure.children.push({
                    type: 'figureCaption',
                    data: {
                        hName: 'figcaption',
                        hProperties: {
                            class: ['figure-caption'],
                        },
                    },
                    children: captionChildren,
                });
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
            const svg = parseSvg(svgString);
            const title = {
                type: 'element',
                tagName: 'title',
                children: [
                    { type: 'text', value: input },
                ],
            };

            node.data = {
                hName: svg.children[0].tagName,
                hProperties: {
                    ...node.data.hProperties,
                    ...svg.children[0].properties,
                },
                hChildren: [title, ...svg.children[0].children],
            };
        });
    };
}

function remarkNote() {
    return (tree, _file) => {
        visit(tree, { type: 'blockquote' }, (node, index, parent) => {
            const firstChild = node.children[0];

            if (firstChild && isMakerNode(firstChild, NOTE_PATTERN)) {
                const maker = firstChild.children[0];
                const variant = mdastToString(maker).toLowerCase().slice(0, -1);
                const captionChildren = firstChild.children.slice(1);

                const note = {
                    type: 'note',
                    data: {
                        hName: 'aside',
                        hProperties: {
                            class: ['note', 'is-' + variant],
                        },
                    },
                    children: [],
                };

                if (captionChildren.length > 0) {
                    trimTextNode(captionChildren[0]);
                    note.children.push({
                        type: 'noteCaption',
                        data: {
                            hName: 'div',
                            hProperties: {
                                class: ['note-caption'],
                            },
                        },
                        children: captionChildren,
                    });
                }

                note.children.push({
                    type: 'noteBody',
                    data: {
                        hName: 'div',
                        hProperties: {
                            class: ['note-body'],
                        },
                    },
                    children: node.children.slice(1),
                });

                parent.children[index] = note;
            }
        });
    };
}

function trimTextNode(node) {
    if (node.type === 'text') {
        node.value = node.value.trimStart();
    }
}

function unsetGraphvizDefaultFontFamily(tree) {
    visit(tree, { type: 'element' }, (node) => {
        if (node.properties &&
            node.properties.fontFamily === 'Times,serif') {
            delete node.properties.fontFamily;
        }
    });
}
