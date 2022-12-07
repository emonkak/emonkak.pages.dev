import { h } from 'hastscript';
import { toText } from 'hast-util-to-text';

import layout from '../lib/templates/layout.js';

export default function render(props) {
    return layout({
        content: renderContent(props),
    });
}

function renderContent(props) {
    return h('div', { class: 'l-container' }, [
        h('section', [
            h('h2', 'Recently Articles'),
            h('ul', { class: 'article-list' }, props.site.articles().map(renderArticle)),
        ]),
    ]);
}

function renderArticle(article) {
    const url = '/' + article.mountPath;
    const publicationDate = article.matter.date ?
        new Date(article.matter.date) :
        article.stats.mtime;
    const tags = article.matter.tags ?? [];
    return h('li', { class: 'article-list-item' }, [
        h('header', { class: 'article-list-item-header' }, [
            h('div', { class: 'article-list-item-title', role: 'heading' }, [
                h('a', { class: 'article-list-item-title-link', href: url }, article.matter.title)
            ]),
            h('div', { class: 'article-list-item-information' }, [
                h('ul', { class: 'inline-list' }, [
                    h('li', { class: 'inline-list-item' }, [
                        h('div', { class: 'tag-list'}, tags.map(renderTag))
                    ]),
                    h('li', { class: 'inline-list-item' }, [
                        h('time', { class: 'u-gray', datetime: publicationDate.toISOString() }, [
                            formatDate(publicationDate),
                        ]),
                    ]),
                ]),
            ]),
        ]),
        h('div', { class: 'article-list-item-body' }, [
            h('p', { class: 'article-list-item-description' }, getDescription(article)),
        ]),
        h('footer', { class: 'article-list-item-footer' }, [
            h('a', { class: ['button', 'is-default', 'is-filled'], href: url }, [
                'Read More'
            ]),
        ]),
    ]);
}

function renderTag(tag) {
    return h('a', { class: 'tag-list-item', href: '/tags/' + tag }, ['#' + tag]);
}

function formatDate(date) {
    const year =  date.getFullYear();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    return `${month} ${day}, ${year}`;
}

function getDescription(article) {
    if (article.matter.description) {
        return article.matter.description;
    }
    for (const child of article.element.children) {
        if (child.type === 'element' && child.tagName === 'p') {
            const text = toText(child).trim();
            if (text !== '') {
                return text;
            }
        }
    }
    return '';
}
