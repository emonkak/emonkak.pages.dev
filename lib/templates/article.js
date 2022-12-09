import { h } from 'hastscript';
import { u } from 'unist-builder';

import { BASE_URL } from '../constants.js';
import { renderArticleCardList } from './articleCard.js';
import renderLayout from './layout.js';

const TWITTER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="icon is-medium"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>';
const FACEBOOK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="icon is-medium"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
const HATENA_BOOKMARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="icon is-medium"><path d="M20.47 0A3.53 3.53 0 0 1 24 3.53v16.94A3.53 3.53 0 0 1 20.47 24H3.53A3.53 3.53 0 0 1 0 20.47V3.53A3.53 3.53 0 0 1 3.53 0h16.94zm-3.705 14.47a1.412 1.412 0 0 0 0 2.824c.78 0 1.41-.645 1.41-1.425s-.63-1.41-1.41-1.41zM8.61 17.247c1.2 0 2.056-.042 2.58-.12.526-.084.976-.222 1.32-.412.45-.232.78-.564 1.02-.99s.36-.915.36-1.48c0-.78-.21-1.403-.63-1.87-.42-.48-.99-.734-1.74-.794.66-.18 1.156-.45 1.456-.81.315-.344.465-.824.465-1.424 0-.48-.103-.885-.3-1.26a2.343 2.343 0 0 0-.883-.87c-.345-.195-.735-.315-1.215-.405-.464-.074-1.29-.12-2.474-.12H5.654v10.486H8.61zm.736-4.185c.705 0 1.185.088 1.44.262.27.18.39.495.39.93 0 .405-.135.69-.42.855-.27.18-.765.254-1.44.254H8.31v-2.297h1.05zm8.656.706v-7.06h-2.46v7.06H18zM8.925 9.08c.71 0 1.185.08 1.432.24.245.16.367.435.367.83 0 .38-.13.646-.39.804-.265.154-.747.232-1.452.232h-.57V9.08h.615z"/></svg>';

export default function renderArticle(props) {
    const { resource } = props;
    return renderLayout({
        title: resource.data.title,
        content: renderContent(props),
    });
}

function renderContent(props) {
    const { resource, site } = props;
    const publicationDate = new Date(resource.data.date ?? resource.timestamp);
    return h('article', { class: 'l-article', lang: resource.data.language }, [
        h('header', { class: 'l-article-header' }, [
            h('div', { class: 'l-container' }, [
                h('div', { class: 'introduction' }, [
                    h('div', { class: 'introduction-bound' }, [
                        resource.data.tags && h('div', { class: 'introduction-bound-body' }, [
                            h(
                                'div',
                                { class: 'tag-list' },
                                resource.data.tags.map(renderTag),
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
        h('div', { class: 'l-article-body' }, [
            h('div', { class: 'l-container' }, [
                h('div', { class: 'article' }, resource.data.element),
                h('div', { class: 'share' }, [
                    h('div', { class: 'share-heading', role: 'heading' }, 'Share this Article'),
                    h('div', { class: 'share-body' }, [
                        h('ul', { class: ['inline-list', 'is-center', 'is-spaced-medium'] }, [
                            h('li', { class: 'inline-list-item' }, [
                                h('a', {
                                    class: 'circle-button',
                                    href: getTwitterShareUrl(resource),
                                    target: '_blank',
                                }, [
                                    u('raw', TWITTER_SVG),
                                ]),
                            ]),
                            h('li', { class: 'inline-list-item' }, [
                                h('a', {
                                    class: 'circle-button',
                                    href: getFacebookShareUrl(resource),
                                    target: '_blank',
                                }, [
                                    u('raw', FACEBOOK_SVG),
                                ]),
                            ]),
                            h('li', { class: 'inline-list-item' }, [
                                h('a', {
                                    class: 'circle-button',
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
        h('footer', { class: 'l-article-footer' }, [
            h('div', { class: 'l-container' }, [
                h('h2', 'You may also like...'),
                renderArticleCardList(site.recommendArticles(resource)),
            ]),
        ]),
    ]);
}

function renderTag(tag) {
    return h('a', { class: ['tag-item', 'is-filled'], href: `/tags/${tag}.html` }, [
        tag,
    ]);
}

function formatDate(date) {
    const year =  date.getFullYear();
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    return `${month} ${day}, ${year}`;
}

function getTwitterShareUrl(resource) {
    const url = new URL('https://twitter.com/intent/tweet?');
    url.searchParams.set('url', BASE_URL + resource.mountPath);
    url.searchParams.set('text', resource.data.title);
    return url;
}

function getFacebookShareUrl(resource) {
    const url = new URL('https://www.facebook.com/sharer/sharer.php');
    url.searchParams.set('u', BASE_URL + resource.mountUrl);
    return url;
}

function getHantenaBookmarkShareUrl(resource) {
    const url = new URL('https://b.hatena.ne.jp/entry');
    url.searchParams.set('url', BASE_URL + resource.mountPath);
    return url;
}
