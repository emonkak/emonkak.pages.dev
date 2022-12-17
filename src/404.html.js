import { h } from 'hastscript';
import { toText } from 'hast-util-to-text';

import { BASE_URL } from '../lib/constants.js';
import renderLayout from '../lib/templates/layout.js';
import renderArticleCardList from '../lib/templates/articleCardList.js';

const NUM_ARTICLES = 10;

export default function render(props) {
    const { site } = props;
    return renderLayout({
        title: '404 Not Found',
        content: renderContent(props),
        documentPath: '/404.html',
        site,
    });
}

function renderContent(props) {
    return h('main', { class: 'l-main' }, [
        h('div', { class: 'l-container' }, [
            h('div', { class: 'error' }, [
                h('h1', { class: 'error-code' }, '404'),
                h('div', { class: 'error-description' }, [
                    h('p', { class: 'error-message' }, 'Sorry, the page you are looking for could not be found.'),
                    h('p', [
                        h('a', { class: ['button', 'is-outlined'], href: '/' }, [
                            'Back to Top →',
                        ]),
                    ]),
                ]),
            ]),
        ]),
    ]);
}