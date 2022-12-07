import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';
import mime from 'mime-types';
import { Graphviz } from '@hpcc-js/wasm/graphviz';
import { toHtml } from 'hast-util-to-html';
import { toXml } from 'xast-util-to-xml';

import { parseMarkdown } from './markdown.js';
import { createTextmateRegistry } from './highlight.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const TEMPLATE_DIR = path.join(__dirname, 'templates');
const CHUNK_SIZE = 16;

export class ResourceLoader {
    static async init() {
        const textmateRegistry = createTextmateRegistry();
        const graphviz = await Graphviz.load();
        return new ResourceLoader(textmateRegistry, graphviz, false);
    }

    static async initWithoutCache() {
        const textmateRegistry = createTextmateRegistry();
        const graphviz = await Graphviz.load();
        return new ResourceLoader(textmateRegistry, graphviz, true);
    }

    constructor(textmateRegistry, graphviz, withoutCache) {
        this._textmateRegistry = textmateRegistry;
        this._graphviz = graphviz;
        this._withoutCache = withoutCache;
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

    async reloadResource(resource) {
        return this._loadResource(resource.srcPath, resource.logicalPath);
    }

    async _loadResource(srcPath, logicalPath) {
        const { path: tailPath, extension } = breakExtension(logicalPath);
        const stats = await fs.stat(srcPath);

        switch (extension.toLowerCase()) {
        case 'md': {
            const file = await parseMarkdown(srcPath, this._textmateRegistry, this._graphviz);
            const matter = file.data.matter ?? {};
            const sections = file.data.sections;
            const render = matter.template
                ? (await this._importModule(getTemplatePath(matter.template))).default
                : ({ resource }) => resource.element;
            return {
                type: 'article',
                srcPath,
                logicalPath,
                mountPath: tailPath + '.html',
                element: file.data.tree,
                stats,
                matter,
                sections,
                render,
            };
        }
        case 'js': {
            const { extension: innerExtension } = breakExtension(tailPath);
            if (['html', 'svg', 'xml'].includes(innerExtension)) {
                const render = (await this._importModule(srcPath)).default;
                return {
                    type: 'template',
                    srcPath,
                    logicalPath,
                    mountPath: tailPath,
                    stats,
                    render,
                };
            }
            break;
        }
        case 'raw':
            return {
                type: 'static',
                srcPath,
                logicalPath,
                mountPath: tailPath,
                stats,
            };
        }
        return {
            type: 'static',
            srcPath,
            logicalPath,
            mountPath: logicalPath,
            stats,
        };
    }

    async _importModule(modulePath) {
        if (this._withoutCache && vm.SourceTextModule) {
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

export async function serveResource(resource, site, req, res) {
    const extension = path.extname(resource.mountPath).slice(1);
    const contentType = mime.lookup(extension);
    switch (resource.type) {
    case 'article':
    case 'template': {
        const element = resource.render({
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
    case 'article': {
        const element = resource.render({
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
        const tailPath = filePath.substring(0, index);
        const extension = filePath.substring(index + 1);
        return { path: tailPath, extension };
    }
    return { path: filePath, extension: '' };
}
