import { h } from 'hastscript';

import Layout from './layout.js';

export default function Page(props) {
    const { resource, site } = props;
    return Layout({
        title: resource.data.title,
        content: Content(props),
        resource,
        site,
    });
}

function Content(props) {
    const { resource } = props;
    return h('article', { class: 'l-page', lang: resource.data.language }, [
        h('div', { class: 'l-container' }, [
            h('div', { class: 'document' }, resource.data.element),
        ]),
    ]);
}
