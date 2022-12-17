import path from 'node:path';
import { h } from 'hastscript';

import renderArticleCardList from './articleCardList.js';
import renderLayout from './layout.js';

export default function renderTags(props) {
    const { resource, site } = props;
    return renderLayout({
        title: 'Tags',
        content: renderContent(props),
        canonicalUrl: resource.documentPath,
        site,
    });
}

function renderContent(props) {
    const { resource, site } = props;
    const tag = path.basename(resource.mountPath, '.html');
    const articles = site.getArticlesByTag(tag);

    return h('section', { class: 'l-main' }, [
        h('div', { class: 'l-container' }, [
            renderArticleCardList(articles),
        ]),
    ]);
}
