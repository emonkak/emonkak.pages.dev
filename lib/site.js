import { serveResource } from './resource.js';

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

        this._documents = sortByKeyDesc(this._documents, getPublicationDate);

        for (const key of Object.keys(this._documentsByTag)) {
            const documents = this._documentsByTag[key];
            this._documentsByTag[key] = sortByKeyDesc(documents, getPublicationDate);
        }
    }

    createHttpHandler(loader) {
        const endPoints = this._resources.reduce((acc, resource, index) => {
            acc['/' + resource.mountPath] = { resource, index };
            return acc;
        }, {});

        return async (req, res) => {
            const url = req.url.endsWith('/') ? req.url + 'index.html' : req.url;
            const endPoint = endPoints[url];
            if (!endPoint) {
                res.statusCode = 404;
                res.end();
                return;
            }
            try {
                const resource = await loader.reloadResource(endPoint.resource);
                await serveResource(resource, this, req, res);
                endPoint.resource = resource;
                this._resources[endPoint.index] = resource;
            } catch (error) {
                console.error(error);
                res.statusCode = 500;
                res.end(error.toString());
            }
        };
    }

    recommendArticles(article) {
        return this.articles();
    }

    resources() {
        return this._resources;
    }

    documents() {
        return this._documents;
    }

    documentsByTag() {
        return this._documentsByTag;
    }

    articles() {
        return this._documents
            .filter((resource) => resource.data.template === 'article.js');
    }

    lastUpdated() {
        return this._resources
            .reduce(
                (acc, resource) => greatest(acc, resource.stats.mtime),
                new Date(0),
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

function getPublicationDate(document) {
    return document.data.date ? new Date(document.data.date) : document.stats.mtime;
}
