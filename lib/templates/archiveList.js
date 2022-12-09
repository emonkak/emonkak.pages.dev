import { h } from 'hastscript';

export default function renderArchiveList(articles) {
    return h('ul', { class: 'archive-list' }, articles.map(renderItem));
}

function renderItem(article) {
    const url = '/' + article.mountPath;
    const publicationDate = new Date(article.data.date ?? article.timestamp);

    return h('li', { class: 'archive-item' }, [
        article.data.tags && h('div', { class: 'archive-item-information' }, [
            h('ul', { class: 'tag-list' }, article.data.tags.map(renderTag)),
        ]),
        h('div', { class: 'archive-item-main' }, [
            h('a', { class: 'archive-item-title', href: url, role: 'heading' }, [
                article.data.title,
            ]),
        ]),
        h('div', { class: 'archive-item-aside' }, [
            h('time', { class: 'archive-item-date', datetime: publicationDate.toISOString() }, [
                formatDate(publicationDate),
            ]),
        ]),
    ]);
}

function renderTag(tag) {
    return h('li', { class: 'tag-item' }, [
        h('a', { class: 'tag-item-label', href: `/tags/${tag}.html` }, tag),
    ]);
}

function formatDate(date) {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
}
