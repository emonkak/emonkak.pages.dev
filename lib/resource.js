import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';

import { toHtml } from 'hast-util-to-html';
import { toXml } from 'xast-util-to-xml';
import mime from 'mime-types';

import { parseMarkdown } from './markdown.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const TEMPLATE_DIR = path.join(__dirname, 'templates');

export async function loadResource(srcPath, logicalPath) {
    const { path: tailPath, extension } = breakExtension(logicalPath);
    const stats = await fs.stat(srcPath);

    switch (extension.toLowerCase()) {
    case 'md': {
        const content = await fs.readFile(srcPath);
        const file = await parseMarkdown(content.toString());
        const matter = file.data.matter ?? {};
        const sections = file.data.sections;
        const render = matter.template
            ? (await loadModule(getTemplatePath(matter.template))).default
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
            const render = (await loadModule(srcPath)).default;
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

export async function writeResource(resource, site, outputDir, callback) {
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

export async function serveResource(resource, site, req, res) {
    const extension = path.extname(resource.mountPath).slice(1);
    const contentType = mime.lookup(extension);
    switch (resource.type) {
    case 'article':
    case 'template': {
        resource = await loadResource(resource.srcPath, resource.logicalPath);
        const element = resource.render({
            resource,
            site,
        });
        const content = stringifyElement(element, extension);
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

async function loadModule(modulePath) {
    if (vm.SourceTextModule) {
        // load a template without caches
        const module = await resolveModule(modulePath);
        await module.link(linker);
        await module.evaluate();
        return module.namespace;
    } else {
        return await import(modulePath);
    }
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
    let modulePath;
    if (specifier.startsWith('./') ||
        specifier.startsWith('../')) {
        const basePath = path.dirname(referencingModule.identifier);
        modulePath = path.normalize(path.join(basePath, specifier));
    } else {
        modulePath = specifier;
    }
    const module = await import(modulePath);
    return new vm.SyntheticModule(Object.keys(module), function() {
        for (const key in module) {
            this.setExport(key, module[key]);
        }
    }, { context: referencingModule.context });
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
