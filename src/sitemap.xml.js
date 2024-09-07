import { u } from 'unist-builder';
import { x } from 'xastscript';

import { BASE_URL } from '../lib/constants.js';

export default function Sitemap(props) {
    const { site } = props;
    const urls = site.allResources().map(Url);
    return u('root', [
        u('instruction', { name: 'xml' }, 'version="1.0" encoding="utf-8"'),
        x('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' }, urls),
    ]);
}

function Url(resource) {
    const url = BASE_URL + resource.documentPath;
    return x('url', [
        x('loc', [url]),
        x('lastmod', [new Date(resource.timestamp).toISOString()]),
    ])
}
