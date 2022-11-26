import path from 'node:path';
import fs from 'node:fs/promises';

import { loadResource, writeResource, serveResource } from './resource.js';

const CHUNK_SIZE = 16;

export default class Site {
    static async load(srcDir) {
        const filePaths = await enumerateDirectoryFiles(srcDir);
        const resources = [];
        for (const filePathChunk of chunk(filePaths, CHUNK_SIZE)) {
            const results = filePathChunk
                .map((filePath) => {
                    const logicalPath = path.relative(srcDir, filePath);
                    return loadResource(filePath, logicalPath);
                });
            resources.push(...await Promise.all(results));
        }
        return new Site(resources);
    }

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

    async write(outputDir, callback) {
        for (const resourceChunk of chunk(this._allResources, CHUNK_SIZE)) {
            const promises = resourceChunk
                .map((resource) => writeResource(resource, this, outputDir, callback));
            await Promise.all(promises);
        }
    }

    createHttpHandler() {
        const endPoints = this._allResources.reduce((acc, resource) => {
            acc['/' + resource.mountPath] = resource;
            return acc;
        }, {});

        return async function handle(req, res) {
            let resource = endPoints[req.url];
            if (!resource) {
                res.statusCode = 404;
                res.end();
                return;
            }
            endPoints[req.url] = await serveResource(resource, this, req, res);
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

async function enumerateDirectoryFiles(dir, files = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const pendingDirs = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            pendingDirs.push(fullPath);
        } else if (entry.isFile()) {
            files.push(fullPath);
        } else if (entry.isSymbolicLink()) {
            const stats = await fs.stat(fullPath);
            if (stats.isFile()) {
                files.push(fullPath);
            } else if (stats.isDir()) {
                pendingDirs.push(fullPath);
            }
        }
    }

    for (const pendingDir of pendingDirs) {
        await enumerateDirectoryFiles(pendingDir, files);
    }

    return files;
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

function* chunk(source, size) {
    const buffer = [];
    let count = 0;

    for (const element of source) {
        if (count < size) {
            count = buffer.push(element);
        } else {
            yield buffer;
            buffer.length = 0;
            count = buffer.push(element);
        }
    }

    if (count > 0) {
        yield buffer;
    }
}
