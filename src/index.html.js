import { h } from 'hastscript';
import { toText } from 'hast-util-to-text';

import renderLayout from '../lib/templates/layout.js';
import renderArticleCardList from '../lib/templates/articleCardList.js';

const NUM_ARTICLES = 10;

export default function render(props) {
    return renderLayout({
        content: renderContent(props),
    });
}

function renderContent(props) {
    const articles = props.site
        .allArticles()
        .slice(0, NUM_ARTICLES)

    return h('section', { class: 'l-section' }, [
        h('div', { class: 'l-container' }, [
            renderArticleCardList(articles),
        ]),
    ]);
}
