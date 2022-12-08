import { h } from 'hastscript';

export function renderArchiveList(articles) {
    return h('ul', { class: 'archive-list' }, articles.map(renderArchiveItem));
}

export function renderArchiveItem(article) {
    const url = '/' + article.mountPath;
    const tags = article.data.tags ?? [];
    const publicationDate = article.data.date ?
        new Date(article.data.date) :
        article.stats.mtime;

    return h('li', { class: 'archive-item' }, [
        h('div', { class: 'archive-item-information' }, [
            h('div', { class: 'tag-list' }, tags.map(renderTag)),
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
    return h('a', { class: ['tag-item', 'is-filled'], href: `/tags/${tag}.html` }, [tag]);
}

function formatDate(date) {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
}
