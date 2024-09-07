import { h } from 'hastscript';

import Layout from '../lib/templates/layout.js';
import ArticleCardList from '../lib/templates/articleCardList.js';
import { BASE_URL, DESCRIPTION, SITE_NAME } from '../lib/constants.js';

const NUM_ARTICLES = 10;

export default function Top(props) {
    const { resource, site } = props;
    return Layout({
        content: Content(props),
        additionalMetadata: AdditionalMetadata(resource),
        site,
        resource,
    });
}

function Content(props) {
    const articles = props.site
        .allArticles()
        .slice(0, NUM_ARTICLES)

    return h('main', { class: 'l-main' }, [
        h('div', { class: 'l-container' }, [
            ArticleCardList(articles),
            h('p', [
                h('a', { class: ['button', 'is-outlined'], href: '/articles/' }, [
                    'View All Articles →',
                ]),
            ])
        ]),
    ]);
}

function AdditionalMetadata() {
    return [
        h('meta', { property: 'description', content: DESCRIPTION }),
        h('meta', { property: 'og:title', content: SITE_NAME }),
        h('meta', { property: 'og:description', content: DESCRIPTION }),
        h('meta', { property: 'og:url', content: BASE_URL + '/' }),
        h('meta', { property: 'og:type', content: 'website' }),
    ];
}
