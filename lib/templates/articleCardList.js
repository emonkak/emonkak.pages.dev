import { h } from 'hastscript';
import { toText } from 'hast-util-to-text';

export default function renderArticleCardList(articles) {
    return h('ul', { class: 'article-card-list' }, articles.map(renderItem));
}

function renderItem(article) {
    const url = '/' + article.mountPath;
    const tags = article.data.tags ?? [];
    const publicationDate = new Date(article.data.date ?? article.stats.mtime);

    return h('li', { class: 'article-card-item' }, [
        h('header', { class: 'article-card-item-header' }, [
            h('div', { class: 'article-card-item-title', role: 'heading' }, [
                h('a', { class: 'article-card-item-title-link', href: url }, article.data.title),
            ]),
            h('div', { class: 'article-card-item-information' }, [
                h('ul', { class: ['inline-list', 'is-separated'] }, [
                    h('li', { class: 'inline-list-item' }, [
                        h('div', { class: ['inline-list', 'is-spaced-small'] }, tags.map(renderTag)),
                    ]),
                    h('li', { class: 'inline-list-item' }, [
                        h('time', { datetime: publicationDate.toISOString() }, [
                            formatDate(publicationDate),
                        ]),
                    ]),
                ]),
            ]),
        ]),
        h('div', { class: 'article-card-item-body' }, [
            h('p', { class: 'article-card-item-description' }, getDescription(article)),
        ]),
        h('footer', { class: 'article-card-item-footer' }, [
            h('a', { class: ['button', 'is-filled'], href: url }, [
                'Read More →',
            ]),
        ]),
    ]);
}

function renderTag(tag) {
    return h('a', { class: 'inline-list-item', href: `/tags/${tag}.html` }, ['#' + tag]);
}

function formatDate(date) {
    const year =  date.getFullYear();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    return `${month} ${day}, ${year}`;
}

function getDescription(article) {
    if (article.data.description) {
        return article.data.description;
    }
    for (const child of article.data.element.children) {
        if (child.type === 'element' && child.tagName === 'p') {
            const text = toText(child).trim();
            if (text !== '') {
                return text;
            }
        }
    }
    return '';
}
