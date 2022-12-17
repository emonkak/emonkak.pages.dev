import { h } from 'hastscript';
import { toText } from 'hast-util-to-text';

import renderArchiveList from '../../lib/templates/archiveList.js';
import renderLayout from '../../lib/templates/layout.js';

export default function render(props) {
    const { site } = props;
    return renderLayout({
        title: 'Articles',
        content: renderContent(props),
        documentPath: '/articles/',
        site,
    });
}

function renderContent(props) {
    const { site } = props;
    const articlesByYear = site
        .allArticles()
        .reduce((acc, article) => {
            const date = new Date(article.data.date);
            const year = date.getFullYear();
            (acc[year] ??= []).push(article);
            return acc;
        }, {});
    return h('main', { class: 'l-main' }, [
        h('div', { class: 'l-container' }, [
            h('div', { class: 'document' }, [
                h('h1', 'Articles'),
                ...Object
                    .keys(articlesByYear)
                    .reverse()
                    .map((year) => {
                        const articles = articlesByYear[year];
                        return [
                            h('h2', year),
                            renderArchiveList(articles),
                        ];
                    })
                    .flat(),
            ])
        ]),
    ]);
}
