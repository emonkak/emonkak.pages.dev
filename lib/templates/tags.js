import { h } from 'hastscript';

import { renderArticleCardList } from '../fragments/articleCard.js';
import renderLayout from './layout.js';

const NUM_ARTICLES = 10;

export default function renderTags(props) {
    return renderLayout({
        content: renderContent(props),
    });
}

function renderContent(props) {
    const articles = props.site
        .articles()
        .slice(0, NUM_ARTICLES);

    return h('section', { class: 'l-section' }, [
        h('div', { class: 'l-container' }, [
            renderArticleCardList(articles),
        ]),
    ]);
}
