import path from 'node:path';

import renderTags from './templates/tags.html.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default class Site {
    constructor(resources) {
        this._resources = resources;
        this._articles = resources.filter(isArticle);
        this._articles = sortDescByKey(this._articles, getPublicationDate);
        this._articlesByTag = this._articles.reduce((acc, article) => {
            const tags = article.data.tags;
            if (Array.isArray(tags)) {
                for (const tag of tags) {
                    (acc[tag] ??= []).push(article);
                }
            }
            return acc;
        }, {});

        for (const tag of Object.keys(this._articlesByTag)) {
            const srcPath = path.join(__dirname, 'templates/tags.html.js');
            const timestamp = this._articlesByTag[tag]
                .reduce(
                    (acc, resource) => greatest(acc, resource.timestamp),
                    0,
                );
            const mountPath = `tags/${tag}.html`;
            const resource = {
                type: 'template',
                srcPath,
                mountPath,
                url: '/' + mountPath,
                timestamp,
                data: { render: renderTags },
            };
            this._resources.push(resource);
        }
    }

    recommendArticles(baseArticle, numArticles) {
        const baseTags = new Set(baseArticle.data.tags ?? []);
        const getScore = (article) => {
            const tagScore = (article.data.tags ?? [])
                .reduce((acc, tag) => {
                    return acc + (baseTags.has(tag) ? 1 : 0);
                }, 0);
            return [tagScore, article.timestamp];
        };
        const candidates = this._articles
            .filter((resource) => resource.mountPath !== baseArticle.mountPath);
        return sortDescByKey(candidates, getScore)
            .slice(0, numArticles);
    }

    allResources() {
        return this._resources;
    }

    allArticles() {
        return this._articles;
    }

    getArticlesByTag(tag) {
        return this._articlesByTag[tag] ?? [];
    }

    lastUpdated() {
        return this._resources
            .reduce(
                (acc, resource) => greatest(acc, resource.timestamp),
                0,
            );
    }
}

function greatest(x, y) {
    return x < y ? y : x;
}

function sortDescByKey(elements, keySelector) {
    return elements.sort((x, y) => {
        const kx = keySelector(x);
        const ky = keySelector(y);
        if (kx > ky) {
            return -1;
        }
        if (kx < ky) {
            return 1;
        }
        return 0;
    });
}

function getPublicationDate(resource) {
    return new Date(resource.data.date ?? resource.timestamp);
}

function isArticle(resource) {
    return resource.type === 'document' &&
        resource.data.template === 'article.js';
}
