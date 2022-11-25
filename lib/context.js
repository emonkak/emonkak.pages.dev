export default class Context {
    constructor(resources) {
        this._allResources = resources;
        this._articles = [];
        this._articlesByTag = {};
        for (const resource of resources) {
            if (resource.type !== 'article') {
                continue
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
