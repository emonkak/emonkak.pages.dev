import { h } from 'hastscript';

import Layout from '../lib/templates/layout.js';

export default function NotFound(props) {
    const { site, resource } = props;
    return Layout({
        title: '404 Not Found',
        content: Content(),
        resource,
        site,
    });
}

function Content() {
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
