export default class Context {
    constructor(resources) {
        this._resources = resources;
    }

    allResources() {
        return this._resources;
    }

    sortedArticles() {
        return this._resources
            .filter((resource) => resource.type === 'article')
            .sort((x, y) => y.stats.mtimeMs - x.stats.mtimeMs);
    }

    lastUpdated() {
        return this._resources
            .reduce(
                (dateTime, resource) => greatest(dateTime, resource.stats.mtime),
                new Date(0),
            );
    }
}

function greatest(x, y) {
    return x < y ? y : x;
}
