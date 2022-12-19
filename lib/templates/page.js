import { h } from 'hastscript';

import renderLayout from './layout.js';

export default function renderPage(props) {
    const { resource, site } = props;
    return renderLayout({
        title: resource.data.title,
        content: renderContent(props),
        resource,
        site,
    });
}

function renderContent(props) {
    const { resource } = props;
    return h('article', { class: 'l-page', lang: resource.data.language }, [
        h('div', { class: 'l-container' }, [
            h('div', { class: 'document' }, resource.data.element),
        ]),
    ]);
}
