import { h } from 'hastscript';

import layout from '../lib/templates/layout.js';

export default function render(props) {
    return layout({
        title: 'My Website',
        content: renderContent(props),
    });
}

function renderContent(props) {
    return h('div', { class: 'l-container' }, [
        h('p', [
            h('a', { id: 'ping', href: 'javascript:void', ping: '/ping' }, ['Ping!']),
        ]),
        h('ul', { class: 'article-list' }, props.site.articles().map(renderArticle)),
    ]);
}

function renderArticle(article) {
    return h('li', { class: 'article-item', href: '/' + article.mountPath }, [
        h('a', { class: 'article-item-target', href: '/' + article.mountPath }, [
            h('div', article.matter.title),
        ]),
    ]);
}
