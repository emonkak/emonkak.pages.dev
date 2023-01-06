import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';
import mime from 'mime-types';
import { toHtml } from 'hast-util-to-html';
import { toXml } from 'xast-util-to-xml';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const TEMPLATE_DIR = path.join(__dirname, 'templates');
const CHUNK_SIZE = 16;
const INDEX_PATTERN = /index\.html$/;

export class ResourceLoader {
    constructor(markdownParser, purgeCache = false) {
        this._markdownParser = markdownParser;
        this._purgeCache = purgeCache;
    }

    createHttpHandler(site) {
        const endPoints = site.allResources().reduce((acc, resource, index) => {
            acc[resource.documentPath] = { resource, index };
            return acc;
        }, {});

        return async (req, res) => {
            const endPoint = endPoints[req.url];
            if (!endPoint) {
                res.statusCode = 404;
                res.end();
                return;
            }
            try {
                await this._reloadResource(endPoint.resource);
                await serveResource(endPoint.resource, site, req, res);
            } catch (error) {
                console.error(error);
                res.statusCode = 500;
                res.end(error.toString());
            }
        };
    }

    async loadFromDirectory(srcDir) {
        const filePaths = await enumerateDirectoryFiles(srcDir);
        const resources = [];
        for (const filePathChunk of chunk(filePaths, CHUNK_SIZE)) {
            const results = filePathChunk
                .map((filePath) => {
                    const logicalPath = path.relative(srcDir, filePath);
                    return this._loadResource(filePath, logicalPath);
                });
            resources.push(...await Promise.all(results));
        }
        return resources;
    }

    async _reloadResource(resource) {
        switch (resource.type) {
        case 'document': {
            const file = await this._markdownParser.parse(
                resource.srcPath,
                this._textmateRegistry,
                this._graphviz,
            );
            const matter = file.data.matter ?? {};
            const render = matter.template
                ? (await this._importModule(getTemplatePath(matter.template))).default
                : ({ resource }) => resource.data.element;
            resource.data = Object.assign({
                element: file.data.tree,
                sections: file.data.sections,
                render,
            }, matter);
            break;
        }
        case 'template': {
            const render = (await this._importModule(resource.srcPath)).default;
            resource.data = { render };
            break;
        }
        }
    }

    async _loadResource(srcPath, logicalPath) {
        const { path: initPath, extension } = breakExtension(logicalPath);
        const stats = await fs.stat(srcPath);

        switch (extension.toLowerCase()) {
        case 'md': {
            const file = await this._markdownParser.parse(
                srcPath,
                this._textmateRegistry,
                this._graphviz,
            );
            const matter = file.data.matter ?? {};
            const render = matter.template
                ? (await this._importModule(getTemplatePath(matter.template))).default
                : ({ resource }) => resource.data.element;
            const mountPath = initPath + '.html';
            return {
                type: 'document',
                srcPath,
                mountPath,
                documentPath: toDocumentPath(mountPath),
                timestamp: stats.mtimeMs,
                data: Object.assign({
                    element: file.data.tree,
                    sections: file.data.sections,
                    render,
                }, matter),
            };
        }
        case 'js': {
            const { extension: innerExtension } = breakExtension(initPath);
            if (['html', 'svg', 'xml'].includes(innerExtension)) {
                const render = (await this._importModule(srcPath)).default;
                return {
                    type: 'template',
                    srcPath,
                    mountPath: initPath,
                    documentPath: toDocumentPath(initPath),
                    timestamp: stats.mtimeMs,
                    data: { render },
                };
            }
            break;
        }
        case 'raw':
            return {
                type: 'static',
                srcPath,
                mountPath: initPath,
                documentPath: toDocumentPath(initPath),
                timestamp: stats.mtimeMs,
                data: {},
            };
        }
        return {
            type: 'static',
            srcPath,
            mountPath: logicalPath,
            documentPath: toDocumentPath(logicalPath),
            timestamp: stats.mtimeMs,
            data: {},
        };
    }

    async _importModule(modulePath) {
        if (this._purgeCache && vm.SourceTextModule) {
            return importModule(modulePath);
        } else {
            return await import(modulePath);
        }
    }
}

export async function writeToDirectory(site, outputDir, callback) {
    for (const resourceChunk of chunk(site.allResources(), CHUNK_SIZE)) {
        const promises = resourceChunk
            .map((resource) => writeResource(resource, site, outputDir, callback));
        await Promise.all(promises);
    }
}

async function serveResource(resource, site, req, res) {
    const extension = path.extname(resource.mountPath).slice(1);
    const contentType = mime.lookup(extension);
    switch (resource.type) {
    case 'document':
    case 'template': {
        const element = resource.data.render({
            resource,
            site,
        });
        const content = stringifyElement(element, extension);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Content-Type', contentType + '; charset=utf-8');
        res.end(content);
        break;
    }
    case 'static': {
        const fd = await fs.open(resource.srcPath);
        const stream = fd.createReadStream();
        res.setHeader('Content-Type', contentType);
        stream.pipe(res);
        break;
    }
    }
    return resource;
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

async function writeResource(resource, site, outputDir, callback) {
    const destPath = path.join(outputDir, resource.mountPath);
    const destDir = path.dirname(destPath);
    if (destDir !== outputDir) {
        await fs.mkdir(destDir, { recursive: true });
    }
    switch (resource.type) {
    case 'template':
    case 'document': {
        const element = resource.data.render({
            resource,
            site,
        });
        const extension = path.extname(resource.mountPath).slice(1);
        const content = stringifyElement(element, extension);
        await fs.writeFile(destPath, content, 'utf-8');
        break;
    }
    case 'static':
        await fs.copyFile(resource.srcPath, destPath);
        break;
    default:
        throw new Error(`Invalid resource type: ${resource.type}`);
    }
    callback(resource);
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

async function importModule(modulePath) {
    // load a module without caches
    const module = await resolveModule(modulePath);
    await module.link(linker);
    await module.evaluate();
    return module.namespace;
}

async function resolveModule(modulePath) {
    const source = await fs.readFile(modulePath, 'utf8');
    return new vm.SourceTextModule(source, {
        identifier: modulePath,
        importModuleDynamically: linker,
        initializeImportMeta(meta) {
            meta.url = url.pathToFileURL(modulePath).href;
        },
    });
}

async function linker(specifier, referencingModule) {
    let module;
    if (specifier.startsWith('.')) {
        const basePath = path.dirname(referencingModule.identifier);
        specifier = path.normalize(path.join(basePath, specifier));
        module = await importModule(specifier);
    } else {
        module = await import(specifier);
    }
    return new vm.SyntheticModule(Object.keys(module), function() {
        for (const key in module) {
            this.setExport(key, module[key]);
        }
    }, { context: referencingModule.context, identifier: specifier });
}

function toDocumentPath(mountPath) {
    return '/' + mountPath.replace(INDEX_PATTERN, '');
}

function getTemplatePath(templateName) {
    return path.join(TEMPLATE_DIR, templateName);
}

function stringifyElement(element, extension) {
    switch (extension) {
    case 'html':
        return toHtml(element, { allowDangerousHtml: true });
    case 'svg':
    case 'xml':
        return toXml(element);
    default:
        return element.toString();
    }
}

function breakExtension(filePath) {
    const index = filePath.lastIndexOf('.');
    if (index > 0) { // Without dot file
        const initPath = filePath.substring(0, index);
        const extension = filePath.substring(index + 1);
        return { path: initPath, extension };
    }
    return { path: filePath, extension: '' };
}
