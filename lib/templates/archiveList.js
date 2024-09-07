import { h } from 'hastscript';

export default function ArchiveList(articles) {
    return h('ul', { class: 'archive-list' }, articles.map(Item));
}

function Item(article) {
    const publicationDate = new Date(article.data.date ?? article.timestamp);

    return h('li', { class: 'archive-item' }, [
        article.data.tags && h('div', { class: 'archive-item-metadata' }, [
            h('ul', { class: 'tag-list' }, article.data.tags.map(Tag)),
        ]),
        h('div', { class: 'archive-item-main' }, [
            h('a', { class: 'archive-item-title', href: article.documentPath, role: 'heading' }, [
                article.data.title,
            ]),
        ]),
        h('div', { class: 'archive-item-date' }, [
            h('time', { datetime: publicationDate.toISOString() }, [
                formatDate(publicationDate),
            ]),
        ]),
    ]);
}

function Tag(tag) {
    return h('li', { class: 'tag-item' }, [
        h('a', { class: 'tag-item-label', href: `/tags/${tag}.html` }, tag),
    ]);
}

function formatDate(date) {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
}
