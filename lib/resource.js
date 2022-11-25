import { promises as fs } from 'node:fs';
import path from 'node:path';

import { toHtml } from 'hast-util-to-html';
import { toXml } from 'xast-util-to-xml';
import mime from 'mime-types';

import { parseMarkdown } from './markdown.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const CHUNK_SIZE = 16;

export async function loadResources(srcDir) {
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
    return resources;
}

export async function writeResources(resources, context, outputDir, callback) {
    for (const resourceChunk of chunk(resources, CHUNK_SIZE)) {
        const promises = resourceChunk
            .map((resource) => writeResource(resource, context, outputDir, callback));
        await Promise.all(promises);
    }
}

export function serveResources(resources, context) {
    const endPoints = resources.reduce((acc, resource) => {
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
        switch (resource.type) {
        case 'article':
        case 'template': {
            resource = await loadResource(resource.srcPath, resource.logicalPath);
            endPoints[req.url] = resource;
            const element = resource.render({
                resource,
                context,
            });
            const content = stringifyElement(element, resource.contentType);
            res.setHeader('Content-Type', resource.contentType + '; charset=utf-8');
            res.end(content);
            break;
        }
        case 'static': {
            const fd = await fs.open(resource.srcPath);
            const stream = fd.createReadStream();
            res.setHeader('Content-Type', resource.contentType);
            stream.pipe(res);
            break;
        }
        }
    };
}

async function loadResource(srcPath, logicalPath) {
    const { path: tailPath, extension } = removeExtension(logicalPath);
    const stats = await fs.stat(srcPath);

    switch (extension.toLowerCase()) {
    case 'md': {
        const content = await fs.readFile(srcPath);
        const file = await parseMarkdown(content.toString());
        const matter = file.data.matter ?? {};
        const sections = file.data.sections;
        const render = matter.template
            ? (await import(getTemplatePath(matter.template))).default
            : ({ resource }) => resource.element;
        return {
            type: 'article',
            srcPath,
            logicalPath,
            mountPath: tailPath + '.html',
            contentType: 'text/html',
            element: file.data.tree,
            stats,
            matter,
            sections,
            render,
        };
    }
    case 'js': {
        const { extension: innerExtension } = removeExtension(tailPath);
        if (['html', 'svg', 'xml'].includes(innerExtension)) {
            const render = (await import(srcPath)).default;
            return {
                type: 'template',
                srcPath,
                logicalPath,
                mountPath: tailPath,
                contentType: mime.lookup(extension),
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
            contentType: mime.lookup(extension),
            stats,
        };
    }
    return {
        type: 'static',
        srcPath,
        logicalPath,
        mountPath: logicalPath,
        contentType: mime.lookup(extension),
        stats,
    };
}

async function writeResource(resource, context, outputDir, callback) {
    const destPath = path.join(outputDir, resource.mountPath);
    const destDir = path.dirname(destPath);
    if (destDir !== outputDir) {
        await fs.mkdir(destDir, { recursive: true });
    }
    switch (resource.type) {
    case 'resource':
    case 'article': {
        const element = resource.render({
            resource,
            context,
        });
        const content = stringifyElement(element, resource.contentType);
        await fs.writeFile(destPath, content, 'utf-8');
        break;
    }
    case 'static':
        await fs.copyFile(resource.srcPath, destPath);
        break;
    }
    callback(resource);
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

function getTemplatePath(templateName) {
    return path.join(__dirname, 'templates', templateName);
}

function stringifyElement(element, contentType) {
    switch (contentType) {
    case 'text/html':
        return toHtml(element, { allowDangerousHtml: true });
    case 'image/svg+xml':
    case 'application/xml':
        return toXml(element);
    default:
        return element.toString();
    }
}

function removeExtension(filePath) {
    const index = filePath.lastIndexOf('.');
    if (index > 0) { // Without dot file
        const tailPath = filePath.substring(0, index);
        const extension = filePath.substring(index + 1);
        return { path: tailPath, extension };
    }
    return { path: filePath, extension: '' };
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
