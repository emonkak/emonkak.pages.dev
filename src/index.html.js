import { h } from 'hastscript';
import { toText } from 'hast-util-to-text';

import renderLayout from '../lib/templates/layout.js';
import renderArticleCardList from '../lib/templates/articleCardList.js';

const NUM_ARTICLES = 10;

export default function render(props) {
    const { resource, site } = props;
    return renderLayout({
        content: renderContent(props),
        site,
        resource,
    });
}

function renderContent(props) {
    const articles = props.site
        .allArticles()
        .slice(0, NUM_ARTICLES)

    return h('main', { class: 'l-main' }, [
        h('div', { class: 'l-container' }, [
            renderArticleCardList(articles),
            h('p', [
                h('a', { class: ['button', 'is-outlined'], href: '/articles/' }, [
                    'View All Articles →',
                ]),
            ])
        ]),
    ]);
}
