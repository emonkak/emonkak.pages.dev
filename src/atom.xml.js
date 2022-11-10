import { toHtml } from 'hast-util-to-html';
import { u } from 'unist-builder';
import { x } from 'xastscript';

const BASE_URL = 'https://emonkak.github.io/';
const MAX_FEED_ENTRIES = 20;

export default function render({ context }) {
    return u('root', [
        u('instruction', { name: 'xml' }, 'version="1.0" encoding="utf-8"'),
        x('feed', { xmlns: 'http://www.w3.org/2005/Atom' }, [
            x('title', ['My Blog']),
            x('links', [
                x('link', { type: 'text/html', href: BASE_URL }),
            ]),
            x('id', [BASE_URL]),
            x('updated', [context.lastUpdated().toISOString()]),
            x('entries', context.sortedArticles().slice(0, MAX_FEED_ENTRIES).map(renderEntry)),
        ]),
    ]);
}

function renderEntry(resource) {
    const url = BASE_URL + resource.mountPath;
    return x('entry', [
        x('title', [resource.matter?.title ?? resource.mountPath]),
        x('links', [
            x('link', { type: 'text/html', href: url }),
        ]),
        x('id', [url]),
        x('updated', [resource.stats.mtime.toISOString()]),
        resource.matter.date && x('published', [resource.matter.date]),
        resource.matter.tags && x('categories', resource.matter.tags.map(renderCategory)),
        resource.matter.summary && x('summary', [resource.matter.summary]),
        x('content', { type: 'text/html' }, [
            u('cdata', toHtml(resource.content, { allowDangerousHtml: true })),
        ])
    ])
}

function renderCategory(tag) {
    return x('category', { term: tag });
}
