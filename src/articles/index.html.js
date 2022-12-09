import { h } from 'hastscript';
import { toText } from 'hast-util-to-text';

import renderLayout from '../../lib/templates/layout.js';
import renderArchiveList from '../../lib/templates/archiveList.js';

export default function render(props) {
    return renderLayout({
        content: renderContent(props),
    });
}

function renderContent(props) {
    const articlesByYear = props.site
        .allArticles()
        .reduce((acc, article) => {
            const date = new Date(article.data.date);
            const year = date.getFullYear();
            (acc[year] ??= []).push(article);
            return acc;
        }, {});
    return h('section', { class: 'l-section' }, [
        h(
            'div',
            { class: 'l-container' },
            Object
                .keys(articlesByYear)
                .reverse()
                .map((year) => {
                    const articles = articlesByYear[year];
                    return [
                        h('div', { class: 'section' }, [
                            h('h1', { class: 'section-heading' }, year),
                            renderArchiveList(articles),
                        ]),
                    ];
                })
                .flat()
        ),
    ]);
}

