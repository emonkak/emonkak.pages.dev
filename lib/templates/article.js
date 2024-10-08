import { h } from 'hastscript';
import { u } from 'unist-builder';

import { BASE_URL, SITE_NAME } from '../constants.js';
import ArticleCardList from './articleCardList.js';
import Layout from './layout.js';

const TWITTER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="icon"><path d="M14.258 10.152L23.176 0h-2.113l-7.747 8.813L7.133 0H0l9.352 13.328L0 23.973h2.113l8.176-9.309 6.531 9.309h7.133zm-2.895 3.293l-.949-1.328L2.875 1.56h3.246l6.086 8.523.945 1.328 7.91 11.078h-3.246zm0 0"/></svg>';
const FACEBOOK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="icon"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
const HATENA_BOOKMARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="icon"><path d="M20.47 0A3.53 3.53 0 0 1 24 3.53v16.94A3.53 3.53 0 0 1 20.47 24H3.53A3.53 3.53 0 0 1 0 20.47V3.53A3.53 3.53 0 0 1 3.53 0h16.94zm-3.705 14.47a1.412 1.412 0 0 0 0 2.824c.78 0 1.41-.645 1.41-1.425s-.63-1.41-1.41-1.41zM8.61 17.247c1.2 0 2.056-.042 2.58-.12.526-.084.976-.222 1.32-.412.45-.232.78-.564 1.02-.99s.36-.915.36-1.48c0-.78-.21-1.403-.63-1.87-.42-.48-.99-.734-1.74-.794.66-.18 1.156-.45 1.456-.81.315-.344.465-.824.465-1.424 0-.48-.103-.885-.3-1.26a2.343 2.343 0 0 0-.883-.87c-.345-.195-.735-.315-1.215-.405-.464-.074-1.29-.12-2.474-.12H5.654v10.486H8.61zm.736-4.185c.705 0 1.185.088 1.44.262.27.18.39.495.39.93 0 .405-.135.69-.42.855-.27.18-.765.254-1.44.254H8.31v-2.297h1.05zm8.656.706v-7.06h-2.46v7.06H18zM8.925 9.08c.71 0 1.185.08 1.432.24.245.16.367.435.367.83 0 .38-.13.646-.39.804-.265.154-.747.232-1.452.232h-.57V9.08h.615z"/></svg>';

const NUM_RECOMMENDED_ARTICLES = 4;

export default function Article(props) {
    const { resource, site } = props;
    return Layout({
        title: resource.data.title,
        content: Content(props),
        additionalMetadata: AdditionalMetadata(resource),
        resource,
        site,
    });
}

function Content(props) {
    const { resource, site } = props;
    const publicationDate = new Date(resource.data.date ?? resource.timestamp);
    const recommendArticles = site.recommendArticles(resource, NUM_RECOMMENDED_ARTICLES);
    return h('article', { class: 'l-article', lang: resource.data.language }, [
        h('header', { class: 'l-article-header' }, [
            h('div', { class: 'l-container' }, [
                h('div', { class: 'introduction' }, [
                    h('div', { class: 'introduction-bound' }, [
                        resource.data.tags && h('div', { class: 'introduction-bound-body' }, [
                            h(
                                'ul',
                                { class: 'tag-list' },
                                resource.data.tags.map(Tag),
                            ),
                        ]),
                    ]),
                    h('h1', { class: 'introduction-title' }, [resource.data.title]),
                    h('div', { class: 'introduction-bound' }, [
                        h('div', { class: 'introduction-bound-body' }, [
                            h(
                                'time',
                                { dateTime: publicationDate.toISOString() },
                                formatDate(publicationDate),
                            ),
                        ]),
                    ]),
                ]),
            ]),
        ]),
        h('main', { class: 'l-article-main' }, [
            h('div', { class: 'l-container' }, [
                resource.data.sections.length > 0 ?
                    Toc(resource.data.sections) :
                    null,
                h('div', { class: 'document' }, resource.data.element),
                h('div', { class: 'share' }, [
                    h('div', { class: 'share-heading', role: 'heading' }, 'Share this article'),
                    h('div', { class: 'share-body' }, [
                        h('ul', { class: ['inline-list', 'is-center', 'is-spaced-large'] }, [
                            h('li', { class: 'inline-list-item' }, [
                                h('a', {
                                    class: 'button is-circle',
                                    href: getTwitterShareUrl(resource),
                                    target: '_blank',
                                }, [
                                    u('raw', TWITTER_SVG),
                                ]),
                            ]),
                            h('li', { class: 'inline-list-item' }, [
                                h('a', {
                                    class: 'button is-circle',
                                    href: getFacebookShareUrl(resource),
                                    target: '_blank',
                                }, [
                                    u('raw', FACEBOOK_SVG),
                                ]),
                            ]),
                            h('li', { class: 'inline-list-item' }, [
                                h('a', {
                                    class: 'button is-circle',
                                    href: getHantenaBookmarkShareUrl(resource),
                                    target: '_blank',
                                }, [
                                    u('raw', HATENA_BOOKMARK_SVG),
                                ]),
                            ]),
                        ]),
                    ]),
                ]),
            ]),
        ]),
        recommendArticles.length > 0 ?
            h('footer', { class: 'l-article-footer' }, [
                h('div', { class: 'l-container' }, [
                    h('h2', 'You may also like...'),
                    ArticleCardList(recommendArticles),
                ]),
            ]) :
            null,
    ]);
}

function Toc(sections) {
    return h('details', { class: 'toc', id: 'toc' }, [
        h('summary', { class: 'toc-heading', role: 'heading' }, 'Table of Contents'),
        h('div', { class: 'toc-content' }, [
            TocList(sections),
        ]),
    ]);
}

function TocList(sections) {
    const items = sections
        .filter((section) => section.depth <= 3)
        .map((section) => {
            const modifier = section.depth === 1 ? 'is-title' :
                section.depth === 2 ? 'is-capter' :
                section.depth === 3 ? 'is-section' :
                null;
            return h('li', { class: ['toc-item', modifier] }, [
                section.depth > 1 ?
                    h('a', { class: 'toc-item-anchor', href: '#' + section.id }, section.heading) :
                    null,
                section.children.length > 0 ?
                    TocList(section.children) :
                    null,
            ]);
        });
    return h('ol', { class: 'toc-list' }, items);
}

function Tag(tag) {
    return h('li', { class: 'tag-item' }, [
        h('a', { class: 'tag-item-label', href: `/tags/${tag}.html` }, tag),
    ]);
}

function AdditionalMetadata(resource) {
    return [
        resource.data.description && h('meta', { property: 'description', content: resource.data.description }),
        resource.data.tags && resource.data.tags.length > 0 ?
            h('meta', { property: 'keywords', content: resource.data.tags.join(',') }) :
            null,
        resource.data.title && h('meta', { property: 'og:title', content: resource.data.title }),
        resource.data.description && h('meta', { property: 'og:description', content: resource.data.description }),
        resource.data.language && h('meta', { property: 'og:locale', content: languageToLocale(resource.data.language) }),
        h('meta', { property: 'og:site_name', content: SITE_NAME }),
        h('meta', { property: 'og:url', content: BASE_URL + resource.documentPath }),
        h('meta', { property: 'og:type', content: 'article' }),
    ];
}

function formatDate(date) {
    const year =  date.getFullYear();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    return `${month} ${day}, ${year}`;
}

function getTwitterShareUrl(resource) {
    const url = new URL('https://twitter.com/intent/tweet?');
    url.searchParams.set('url', BASE_URL + resource.documentPath);
    url.searchParams.set('text', resource.data.title);
    return url;
}

function getFacebookShareUrl(resource) {
    const url = new URL('https://www.facebook.com/sharer/sharer.php');
    url.searchParams.set('u', BASE_URL + resource.documentPath);
    return url;
}

function getHantenaBookmarkShareUrl(resource) {
    const url = new URL('https://b.hatena.ne.jp/entry');
    url.searchParams.set('url', BASE_URL + resource.documentPath);
    return url;
}

function languageToLocale(language) {
    if (language === 'ja') {
        return 'ja_JP';
    }
    if (language === 'en') {
        return 'en_US';
    }
    return null;
}
