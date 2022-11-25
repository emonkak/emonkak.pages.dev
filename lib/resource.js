import { promises as fs } from 'node:fs';
import path from 'node:path';

import { toHtml } from 'hast-util-to-html';
import { toXml } from 'xast-util-to-xml';

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

export async function writeResources(resources, outputDir, context, report) {
    for (const resourceChunk of chunk(resources, CHUNK_SIZE)) {
        const promises = resourceChunk.map((resource) => {
            switch (resource.type) {
            case 'template':
            case 'article':
                return writeTemplate(outputDir, resource, context, report);
            case 'static':
                return writeStaticFile(outputDir, resource, report);
            default:
                throw new Error(`Unexpected resource: ${resource.type}`);
            }
        });
        await Promise.all(promises);
    }
}

export async function copyDirectoryContents(srcDir, outputDir, report) {
    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(outputDir, entry.name);
        if (entry.isDirectory()) {
            await fs.mkdir(destPath, { recursive: true });
            await copyDirectoryContents(srcPath, destPath, report);
        } else if (entry.isFile()) {
            await fs.copyFile(srcPath, destPath);
            report('copy', srcPath, destPath);
        } else if (entry.isSymbolicLink()) {
            const linkPath = fs.readlink(srcPath);
            await fs.link(destPath, linkPath);
            report('link', srcPath, destPath);
        }
    }
}

async function loadResource(srcPath, logicalPath) {
    const [tailPath, extension] = removeExtension(logicalPath);
    const stats = await fs.stat(srcPath);

    switch (extension.toLowerCase()) {
    case 'md': {
        const mountPath = tailPath + '.html';
        const content = await fs.readFile(srcPath);
        const file = await parseMarkdown(content.toString());
        const matter = file.data.matter ?? {};
        const sections = file.data.sections;
        const render = matter.template
            ? (await import(getTemplatePath(matter.template))).default
            : ({ resource }) => resource.content;
        return {
            type: 'article',
            srcPath,
            mountPath,
            stats,
            render,
            content: file.data.tree,
            matter,
            sections,
        };
    }
    case 'js': {
        const mountPath = tailPath;
        const render = (await import(srcPath)).default;
        return {
            type: 'template',
            srcPath,
            mountPath,
            stats,
            render,
        };
    }
    default:
        return {
            type: 'static',
            srcPath,
            mountPath: logicalPath,
            stats,
        };
    }
}

async function writeTemplate(outputDir, resource, context, report) {
    const destPath = path.join(outputDir, resource.mountPath);
    const destDir = path.dirname(destPath);
    if (destDir !== outputDir) {
        await fs.mkdir(destDir, { recursive: true });
    }
    const element = resource.render({
        resource,
        context,
    });
    const content = stringifyElement(element, resource.mountPath);
    await fs.writeFile(destPath, content, 'utf-8');
    report(resource.type, resource.srcPath, destPath);
    return destPath;
}

async function writeStaticFile(outputDir, resource, report) {
    const destPath = path.join(outputDir, resource.mountPath);
    const destDir = path.dirname(destPath);
    if (destDir !== outputDir) {
        await fs.mkdir(destDir, { recursive: true });
    }
    await fs.copyFile(resource.srcPath, destPath);
    report(resource.type, resource.srcPath, destPath);
    return destPath;
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

function stringifyElement(element, mountPath) {
    const extension = path.extname(mountPath).slice(1);
    switch (extension.toLowerCase()) {
    case 'html':
        return toHtml(element, { allowDangerousHtml: true });
    case 'svg':
    case 'xml':
        return toXml(element);
    default:
        return element.toString();
    }
}

function removeExtension(filename) {
    const index = filename.lastIndexOf('.');
    const tailPath = filename.substring(0, index);
    const extension = filename.substring(index + 1);
    return [tailPath, extension];
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
