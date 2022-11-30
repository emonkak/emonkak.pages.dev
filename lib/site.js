import { serveResource } from './resource.js';

export default class Site {
    constructor(resources) {
        this._allResources = resources;
        this._articles = [];
        this._articlesByTag = {};
        for (const resource of resources) {
            if (resource.type !== 'article') {
                continue;
            }
            this._articles.push(resource);
            if (Array.isArray(resource.matter.tags)) {
                for (const tag of resource.matter.tags) {
                    if (!this._articlesByTag[tag]) {
                        this._articlesByTag[tag] = [];
                    }
                    this._articlesByTag[tag].push(resource);
                }
            }
        }
        sortByKey(this._articles, getArticleDate);
        for (const articles of Object.values(this._articlesByTag)) {
            sortByKey(articles, getArticleDate);
        }
    }

    createHttpHandler(loader) {
        const endPoints = this._allResources.reduce((acc, resource, index) => {
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
                this._allResources[endPoint.index] = resource;
            } catch (error) {
                console.error(error);
                res.statusCode = 500;
                res.end(error.toString());
            }
        };
    }

    allResources() {
        return this._allResources;
    }

    articles() {
        return this._articles;
    }

    articlesByTag() {
        return this._articlesByTag;
    }

    lastUpdated() {
        return this._allResources
            .reduce(
                (acc, resource) => greatest(acc, resource.stats.mtime),
                new Date(0),
            );
    }
}

function greatest(x, y) {
    return x < y ? y : x;
}

function sortByKey(elements, keySelector) {
    return elements.sort((x, y) => {
        const kx = keySelector(x);
        const ky = keySelector(y);
        if (kx < ky) {
            return -1;
        }
        if (kx > ky) {
            return 1;
        }
        return 0;
    });
}

function getArticleDate(article) {
    return article.matter.date ? new Date(article.matter.date) : article.stats.mtime;
}
