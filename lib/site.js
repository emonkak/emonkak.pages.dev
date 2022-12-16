import path from 'node:path';

import renderTags from './templates/tags.html.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default class Site {
    #resources;

    #articles;

    #articlesByTag;

    #mode;

    constructor(resources, mode) {
        this.#resources = resources;
        this.#articles = resources.filter(isArticle);
        this.#articles = sortDescByKey(this.#articles, getPublicationDate);
        this.#articlesByTag = this.#articles.reduce((acc, article) => {
            const tags = article.data.tags;
            if (Array.isArray(tags)) {
                for (const tag of tags) {
                    (acc[tag] ??= []).push(article);
                }
            }
            return acc;
        }, {});
        this.#mode = mode;

        for (const tag in this.#articlesByTag) {
            const srcPath = path.join(__dirname, 'templates/tags.html.js');
            const timestamp = this.#articlesByTag[tag]
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
                data: { render: renderTags },
            };
            this.#resources.push(resource);
        }
    }

    recommendArticles(baseArticle, numArticles) {
        const baseTags = new Set(baseArticle.data.tags ?? []);
        const scores = this.#articles.reduce((acc, article) => {
            const score = (article.data.tags ?? [])
                .reduce((acc, tag) => acc + (baseTags.has(tag) ? 1 : 0), 0);
            acc.set(article, score);
            return acc;
        }, new Map());
        const candidates = this.#articles
            .filter((article) =>
                scores.get(article) > 0 &&
                    article.mountPath !== baseArticle.mountPath);
        return sortDescByKey(candidates, (article) => [
                scores.get(article),
                getPublicationDate(article),
            ])
            .slice(0, numArticles);
    }

    allResources() {
        return this.#resources;
    }

    allArticles() {
        return this.#articles;
    }

    getArticlesByTag(tag) {
        return this.#articlesByTag[tag] ?? [];
    }

    lastUpdated() {
        return this.#resources
            .reduce(
                (acc, resource) => greatest(acc, resource.timestamp),
                0,
            );
    }

    mode() {
        return this.#mode;
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

function getPublicationDate(article) {
    return new Date(article.data.date ?? article.timestamp);
}

function isArticle(resource) {
    return resource.type === 'document' &&
        resource.data.template === 'article.js';
}
