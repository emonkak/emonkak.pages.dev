import { h } from 'hastscript';
import { u } from 'unist-builder';

import { AUTHOR_NAME, EMAIL_ADDREES, SITE_NAME, TAGLINE } from '../constants.js';

export default function renderLayout(props) {
    const { title, content } = props;
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
                    renderHeader(),
                    h('main', { class: 'l-main' }, [
                        content,
                    ]),
                    renderFooter(),
                ]),
            ]),
        ]),
    ]);
}

function renderHeader() {
    return h('header', { class: 'l-header' }, [
        h('div', { class: 'l-container' }, [
            h('div', { class: 'header' }, [
                h('div', { class: 'header-tagline' }, TAGLINE),
                h('a', { class: 'header-title', href: '/' }, [
                    h('div', {
                        class: 'header-title-logo',
                        style: { '--letters': SITE_NAME.length },
                    }, SITE_NAME),
                    h('div', { class: 'header-title-author' }, [
                        `Authored by ${AUTHOR_NAME}`,
                    ]),
                ]),
                h('nav', { class: 'header-nav' }, [
                    h('menu', { class: 'nav-menu' }, [
                        h('li', { class: 'nav-menu-item' }, [
                            h('a', { class: 'nav-menu-item-link', href: '/about.html' }, 'About'),
                        ]),
                        h('li', { class: 'nav-menu-item' }, [
                            h('a', { class: 'nav-menu-item-link', href: '/articles/' }, 'Articles'),
                        ]),
                        h('li', { class: 'nav-menu-item' }, [
                            h('a', { class: 'nav-menu-item-link', href: '/works/' }, 'Works'),
                        ]),
                        h('li', { class: 'nav-menu-item' }, [
                            h('a', { class: 'nav-menu-item-link', href: '/feeds/atom.xml' }, 'Feed'),
                        ]),
                    ]),
                ]),
            ]),
        ]),
    ]);
}

function renderFooter() {
    return h('footer', { class: 'l-footer' }, [
        h('div', { class: 'l-container' }, [
            h('div', { class: 'footer' }, [
                h('div', { class: 'footer-main' }, [
                    h('div', { class: 'footer-group' }, [
                        h('h1', { class: 'footer-title' }, [
                            h('a', { class: 'footer-title-link', href: '/' }, SITE_NAME),
                        ]),
                        h('div', { class: 'footer-author' }, [
                            'Authored by ',
                            h('strong', AUTHOR_NAME),
                        ]),
                    ]),
                ]),
                h('div', { class: 'footer-aside' }, [
                    h('div', { class: 'footer-group' }, [
                        h('h2', { class: 'footer-heading' }, [
                            'Contents',
                        ]),
                        h('div', { class: 'footer-item' }, [
                            h('a', { class: 'footer-item-link', href: '/about.html' }, 'About'),
                        ]),
                        h('div', { class: 'footer-item' }, [
                            h('a', { class: 'footer-item-link', href: '/articles/' }, 'Articles'),
                        ]),
                        h('div', { class: 'footer-item' }, [
                            h('a', { class: 'footer-item-link', href: '/works/' }, 'Works'),
                        ]),
                        h('div', { class: 'footer-item' }, [
                            h('a', { class: 'footer-item-link', href: '/feeds/atom.xml' }, 'Feed'),
                        ]),
                    ]),
                ]),
                h('div', { class: 'footer-aside' }, [
                    h('div', { class: 'footer-group' }, [
                        h('h2', { class: 'footer-heading' }, [
                            'Links',
                        ]),
                        h('div', { class: 'footer-item' }, [
                            h('a', { class: 'footer-item-link', href: 'https://twitter.com/@emonkak', target: '_blank' }, 'Twitter'),
                        ]),
                        h('div', { class: 'footer-item' }, [
                            h('a', { class: 'footer-item-link', href: 'https://github.com/emonkak', target: '_blank' }, 'GitHub'),
                        ]),
                    ]),
                    h('div', { class: 'footer-group' }, [
                        h('h2', { class: 'footer-heading' }, [
                            'Contact',
                        ]),
                        h('div', { class: 'footer-item' }, [
                            h('address', EMAIL_ADDREES),
                        ]),
                    ]),
                ]),
            ]),
        ]),
    ]);
}
