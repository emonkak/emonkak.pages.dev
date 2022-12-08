import { toHtml } from 'hast-util-to-html';
import { u } from 'unist-builder';
import { x } from 'xastscript';

import { BASE_URL, SITE_NAME, TAGLINE } from '../../lib/constants.js';

const MAX_FEED_ENTRIES = 20;

export default function render(props) {
    const { site } = props;
    const documents = site
        .documents()
        .slice()
        .sort((x, y) => y.stats.mtimeMs - x.stats.mtimeMs)
        .slice(0, MAX_FEED_ENTRIES);
    return u('root', [
        u('instruction', { name: 'xml' }, 'version="1.0" encoding="utf-8"'),
        x('feed', { xmlns: 'http://www.w3.org/2005/Atom' }, [
            x('title', SITE_NAME),
            x('subtitle', TAGLINE),
            x('id', BASE_URL),
            x('link', { type: 'text/html', rel: 'alternate', href: BASE_URL }),
            x('link', { type: 'application/atom+xml', rel: 'self', href: BASE_URL + 'atom.xml' }),
            x('updated', [site.lastUpdated().toISOString()]),
            documents.map(renderEntry),
        ]),
    ]);
}

function renderEntry(resource) {
    const url = BASE_URL + resource.mountPath;
    return x('entry', [
        x('title', [resource.data.title ?? resource.mountPath]),
        x('id', [url]),
        x('link', { type: 'text/html', ref: 'alternate', href: url }),
        x('updated', [resource.stats.mtime.toISOString()]),
        resource.data.date && x('published', [getPublicationDate(resource).toISOString()]),
        resource.data.tags && resource.data.tags.map(renderCategory),
        resource.data.summary && x('summary', { type: 'text' }, [resource.matter.summary]),
        x('content', { type: 'html' }, [
            u('cdata', toHtml(resource.data.element, { allowDangerousHtml: true })),
        ])
    ])
}

function renderCategory(tag) {
    return x('category', { term: tag });
}

function getPublicationDate(document) {
    return document.data.date ? new Date(document.data.date) : document.stats.mtime;
}
