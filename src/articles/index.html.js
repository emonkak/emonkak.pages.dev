import { h } from 'hastscript';

import ArchiveList from '../../lib/templates/archiveList.js';
import Layout from '../../lib/templates/layout.js';

export default function Articles(props) {
    const { site, resource } = props;
    return Layout({
        title: 'Articles',
        content: Content(props),
        resource,
        site,
    });
}

function Content(props) {
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
                            ArchiveList(articles),
                        ];
                    })
                    .flat(),
            ])
        ]),
    ]);
}
