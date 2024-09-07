import path from 'node:path';
import { h } from 'hastscript';

import ArticleCardList from './articleCardList.js';
import Layout from './layout.js';

export default function Tags(props) {
    const { resource, site } = props;
    return Layout({
        title: 'Tags',
        content: Content(props),
        resource,
        site,
    });
}

function Content(props) {
    const { resource, site } = props;
    const tag = path.basename(resource.mountPath, '.html');
    const articles = site.getArticlesByTag(tag);

    return h('section', { class: 'l-main' }, [
        h('div', { class: 'l-container' }, [
            ArticleCardList(articles),
        ]),
    ]);
}
