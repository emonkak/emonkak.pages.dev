import path from 'node:path';

import Tags from './templates/tags.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default class Site {
    constructor(resources, mode) {
        this._resources = resources;
        this._articles = sortDescByKey(resources.filter(isArticle), getPublicationDate);
        this._articlesByTag = this._articles.reduce((acc, article) => {
            const tags = article.data.tags;
            if (Array.isArray(tags)) {
                for (const tag of tags) {
                    (acc[tag] ??= []).push(article);
                }
            }
            return acc;
        }, {});
        this._mode = mode;

        for (const tag in this._articlesByTag) {
            const srcPath = path.join(__dirname, 'templates/tags.js');
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
                documentPath: '/' + mountPath,
                timestamp,
                data: { render: Tags },
            };
            this._resources.push(resource);
        }
    }

    recommendArticles(baseArticle, numArticles) {
        const baseTags = new Set(baseArticle.data.tags ?? []);
        const scores = this._articles.reduce((acc, article) => {
            const score = (article.data.tags ?? [])
                .reduce((acc, tag) => acc + (baseTags.has(tag) ? 1 : 0), 0);
            acc.set(article, score);
            return acc;
        }, new Map());
        const candidates = this._articles
            .filter((article) => article.mountPath !== baseArticle.mountPath);
        return sortDescByKey(candidates, (article) => [
                scores.get(article),
                getPublicationDate(article),
            ])
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

    mode() {
        return this._mode;
    }
}

function greatest(x, y) {
    return x < y ? y : x;
}

function sortDescByKey(elements, keySelector) {
    return elements.sort((x, y) => {
        const kx = keySelector(x);
        const ky = keySelector(y);
        return ky - kx;
    });
}

function getPublicationDate(article) {
    return new Date(article.data.date ?? article.timestamp);
}

function isArticle(resource) {
    return resource.type === 'document' &&
        resource.data.template === 'article.js';
}
