import { h } from 'hastscript';
import { u } from 'unist-builder';

import { SITE_NAME, TAGLINE } from '../constants.js';

export default function renderLayout(props) {
    const { title, content } = props;
    const currentYear = new Date().getFullYear();
    return u('root', [
        u('doctype'),
        h('html', [
            h('head', [
                h('meta', { charset: 'utf-8' }),
                h('meta', { name: 'viewport', content: 'width=device-width,initial-scale=1,minimum-scale=1.0,maximum-scale=1.0' }),
                h('title', title ? (title + ' - ' + SITE_NAME) : SITE_NAME),
                h('link', { rel: 'stylesheet', href: '/index.css' }),
            ]),
            h('body', [
                h('div', { class: 'l-root' }, [
                    h('header', { class: 'l-header' }, [
                        h('div', { class: 'l-container' }, [
                            h('div', { class: 'header' }, [
                                h('div', { class: 'header-tagline' }, TAGLINE),
                                h('a', { class: 'header-title', href: '/' }, [
                                    h('div', { class: 'header-title-logo', style: { '--letters': SITE_NAME.length } }, SITE_NAME),
                                    h('div', { class: 'header-title-author' }, [
                                        'Authored by Shota Nozaki',
                                    ]),
                                ]),
                                h('nav', { class: 'header-nav' }, [
                                    h('menu', { class: 'nav-menu' }, [
                                        h('li', { class: 'nav-menu-item' }, [
                                            h('a', { class: 'nav-menu-item-link', href: '/' }, 'About'),
                                        ]),
                                        h('li', { class: 'nav-menu-item' }, h('a', { class: 'nav-menu-item-link', href: '/' }, 'Articles'),
                                        ),
                                        h('li', { class: 'nav-menu-item' }, h('a', { class: 'nav-menu-item-link', href: '/' }, 'Works'),
                                        ),
                                        h('li', { class: 'nav-menu-item' }, h('a', { class: 'nav-menu-item-link', href: '/' }, 'Feed'),
                                        ),
                                    ]),
                                ]),
                            ]),
                        ]),
                    ]),
                    h('main', { class: 'l-main' }, [
                        content,
                    ]),
                    h('footer', { class: 'l-footer' }, [
                        h('div', { class: 'l-container' }, [
                            h('div', { class: 'footer' }, [
                                h('div', { class: 'footer-copyright' }, [
                                    `Copyright ${currentYear} Shota Nozaki`,
                                ]),
                            ]),
                        ]),
                    ]),
                ]),
            ]),
        ]),
    ]);
}
