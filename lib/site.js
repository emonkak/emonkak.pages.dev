import path from 'node:path';

import renderTags from './templates/tags.html.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default class Site {
    constructor(resources) {
        this._resources = resources;
        this._documents = [];
        this._documentsByTag = {};

        for (const resource of resources) {
            if (resource.type !== 'document') {
                continue;
            }
            this._documents.push(resource);
            if (Array.isArray(resource.data.tags)) {
                for (const tag of resource.data.tags) {
                    if (!this._documentsByTag[tag]) {
                        this._documentsByTag[tag] = [];
                    }
                    this._documentsByTag[tag].push(resource);
                }
            }
        }

        for (const tag of Object.keys(this._documentsByTag)) {
            const srcPath = path.join(__dirname, 'templates/tags.html.js');
            const timestamp = this._documentsByTag[tag]
                .reduce(
                    (acc, resource) => greatest(acc, resource.timestamp),
                    0,
                );
            const resource = {
                type: 'template',
                srcPath,
                mountPath: `tags/${tag}.html`,
                timestamp,
                data: { render: renderTags },
            };
            this._resources.push(resource);
            this._documents.push(resource);
        }

        this._documents = sortByKeyDesc(this._documents, getPublicationDate);

        for (const key of Object.keys(this._documentsByTag)) {
            const documents = this._documentsByTag[key];
            this._documentsByTag[key] = sortByKeyDesc(documents, getPublicationDate);
        }
    }

    recommendArticles(_article) {
        // TODO:
        return this.articles();
    }

    resources() {
        return this._resources;
    }

    documents() {
        return this._documents;
    }

    articles() {
        return this._documents
            .filter((resource) => resource.data.template === 'article.js');
    }

    getArticlesByTag(tag) {
        return (this._documentsByTag[tag] ?? [])
            .filter((resource) => resource.data.template === 'article.js');
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

function sortByKeyDesc(elements, keySelector) {
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
