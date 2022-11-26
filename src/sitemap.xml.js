import { u } from 'unist-builder';
import { x } from 'xastscript';

const BASE_URL = 'https://emonkak.github.io/';

export default function render({ site }) {
    const urls = site.allResources().map(renderUrl);
    return u('root', [
        u('instruction', { name: 'xml' }, 'version="1.0" encoding="utf-8"'),
        x('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' }, urls),
    ]);
}

function renderUrl(resource) {
    const url = BASE_URL + resource.mountPath;
    return x('url', [
        x('loc', [url]),
        x('lastmod', [resource.stats.mtime.toISOString()]),
    ])
}
