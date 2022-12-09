import path from 'node:path';
import { h } from 'hastscript';

import renderArticleCardList from './articleCardList.js';
import renderLayout from './layout.js';

export default function renderTags(props) {
    return renderLayout({
        content: renderContent(props),
    });
}

function renderContent(props) {
    const { resource, site } = props;
    const tag = path.basename(resource.mountPath, '.html');
    const articles = site.getArticlesByTag(tag);

    return h('section', { class: 'l-section' }, [
        h('div', { class: 'l-container' }, [
            renderArticleCardList(articles),
        ]),
    ]);
}
