import { h } from 'hastscript';

import layout from './layout.js';

export default function render(props) {
    const { resource } = props;
    return layout({
        title: resource.matter.title,
        content: renderContent(props),
    });
}

function renderContent(props) {
    const { resource } = props;
    const publicationDate = formatDate(new Date(resource.matter.date));
    return h('article', { class: 'l-article', lang: resource.matter.language }, [
        h('header', { class: 'l-article-header' }, [
            h('div', { class: 'l-container' }, [
                h('div', { class: 'introduction' }, [
                    resource.matter.tags &&
                        h('div', { class: 'introduction-top' }, [
                            h('div', { class: 'bordered' }, [
                                h(
                                    'div',
                                    { class: 'tag-list' },
                                    resource.matter.tags.map(renderTag),
                                ),
                            ]),
                        ]),
                    h('h1', { class: 'introduction-title' }, [resource.matter.title]),
                    h('div', { class: 'introduction-bottom' }, [
                        h('div', { class: ['bordered', 'is-start'] }, [
                            h('time', { dateTime: resource.matter.date }, [
                                publicationDate,
                            ]),
                        ]),
                    ]),
                ]),
            ]),
        ]),
        h('div', { class: 'l-article-body' }, [
            h('div', { class: 'l-container' }, [
                h('div', { class: 'article' }, resource.element),
            ]),
        ]),
    ]);
}

function renderTag(label) {
    return h('a', { class: 'tag', href: '/tags/' + label }, [label]);
}

function formatDate(date) {
    const year =  date.getFullYear();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    return `${month} ${day}, ${year}`;
}
