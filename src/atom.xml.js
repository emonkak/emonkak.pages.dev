import { toHtml } from 'hast-util-to-html';
import { u } from 'unist-builder';
import { x } from 'xastscript';

const BASE_URL = 'https://emonkak.github.io/';
const MAX_FEED_ENTRIES = 20;

export default function render({ site }) {
    const articles = site
        .articles()
        .slice()
        .sort((x, y) => y.stats.mtimeMs - x.stats.mtimeMs)
        .slice(0, MAX_FEED_ENTRIES);
    return u('root', [
        u('instruction', { name: 'xml' }, 'version="1.0" encoding="utf-8"'),
        x('feed', { xmlns: 'http://www.w3.org/2005/Atom' }, [
            x('title', { type: 'text' }, ['My Blog']),
            x('id', [BASE_URL]),
            x('link', { type: 'text/html', rel: 'alternate', href: BASE_URL }),
            x('link', { type: 'application/atom+xml', rel: 'self', href: BASE_URL + 'atom.xml' }),
            x('updated', [site.lastUpdated().toISOString()]),
            articles.map(renderEntry),
        ]),
    ]);
}

function renderEntry(article) {
    const url = BASE_URL + article.mountPath;
    return x('entry', [
        x('title', [article.matter?.title ?? article.mountPath]),
        x('id', [url]),
        x('link', { type: 'text/html', ref: 'alternate', href: url }),
        x('updated', [article.stats.mtime.toISOString()]),
        article.matter.date && x('published', [article.matter.date]),
        article.matter.tags && article.matter.tags.map(renderCategory),
        article.matter.summary && x('summary', { type: 'text' }, [article.matter.summary]),
        x('content', { type: 'html' }, [
            u('cdata', toHtml(article.element, { allowDangerousHtml: true })),
        ])
    ])
}

function renderCategory(tag) {
    return x('category', { term: tag });
}
