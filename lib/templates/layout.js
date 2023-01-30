import { h } from 'hastscript';
import { u } from 'unist-builder';

import { AUTHOR_NAME, BASE_URL, EMAIL_ADDREES, GA_TRACKING_ID, SITE_NAME, TAGLINE } from '../constants.js';

export default function renderLayout(props) {
    const { additionalMetadata, content, resource, site, title } = props;
    const trackingUrl = getTrackingUrl(resource.documentPath, title);
    return u('root', [
        u('doctype'),
        h('html', { lang: 'ja' }, [
            h('head', [
                h('meta', { charset: 'utf-8' }),
                h('meta', { name: 'viewport', content: 'width=device-width' }),
                h('meta', { name: 'format-detection', content: 'telephone=no' }),
                h('meta', { name: 'theme-color', content: '#12234d' }),
                h('title', title ? (title + ' - ' + SITE_NAME) : SITE_NAME),
                h('link', { rel: 'stylesheet', href: '/index.css' }),
                h('link', { rel: 'alternate', type: 'application/atom+xml', href: '/feeds/atom.xml' }),
                h('link', { rel: 'icon', href: 'data:;base64' }),
                h('link', { rel: 'canonical', href: BASE_URL + resource.documentPath }),
                h('meta', { property: 'og:image', content: BASE_URL + '/ogp.jpg' }),
                h('meta', { property: 'og:image:type', content: 'image/jpeg' }),
                h('meta', { property: 'og:image:width', content: '1200' }),
                h('meta', { property: 'og:image:height', content: '600' }),
                additionalMetadata,
            ]),
            h('body', [
                h('div', { class: 'l-root' }, [
                    renderHeader(),
                    content,
                    renderFooter(),
                ]),
                site.mode() === 'build' ?
                    h('img', { src: trackingUrl.toString(), width: '0', height: '0' }) :
                    null,
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
                            h('a', { class: 'nav-menu-item-anchor', href: '/about.html' }, 'About'),
                        ]),
                        h('li', { class: 'nav-menu-item' }, [
                            h('a', { class: 'nav-menu-item-anchor', href: '/articles/' }, 'Articles'),
                        ]),
                        h('li', { class: 'nav-menu-item' }, [
                            h('a', { class: 'nav-menu-item-anchor', href: '/works/' }, 'Works'),
                        ]),
                        h('li', { class: 'nav-menu-item' }, [
                            h('a', { class: 'nav-menu-item-anchor', href: '/feeds/atom.xml' }, 'Feed'),
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
                            h('a', { class: 'footer-title-anchor', href: '/' }, SITE_NAME),
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

function getTrackingUrl(documentPath, title) {
    const url = new URL('https://www.google-analytics.com/collect');
    url.searchParams.set('v', '1');
    url.searchParams.set('tid', GA_TRACKING_ID);
    url.searchParams.set('cid', '555');
    url.searchParams.set('t', 'pageview');
    url.searchParams.set('dl', BASE_URL + documentPath);
    url.searchParams.set('dt', title ?? SITE_NAME);
    return url;
}
