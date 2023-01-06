import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { ResourceLoader, writeToDirectory } from './lib/resource.js';
import { MarkdownParser } from './lib/markdown.js';
import Site from './lib/site.js';

const rootDir = path.dirname(new URL(import.meta.url).pathname);
const srcDir = path.join(rootDir, 'src');
const outputDir = path.join(rootDir, 'dist');

async function build() {
    let totalGeneratedResources = 0;

    const callback = (resource) => {
        const srcPath = path.relative(rootDir, resource.srcPath);
        const destPath = path.relative(rootDir, path.join(outputDir, resource.mountPath));
        console.log(`[${resource.type}]`, srcPath, '->', destPath);
        totalGeneratedResources++;
    };

    const startTime = process.hrtime();

    try {
        await fs.mkdir(outputDir, { recursive: true });
        const markdownParser = await MarkdownParser.init();
        const loader = new ResourceLoader(markdownParser);
        const resources = await loader.loadFromDirectory(srcDir);
        const site = new Site(resources, 'build');
        await writeToDirectory(site, outputDir, callback);
    } catch (error) {
        console.error('Build FAILED.');
        return Promise.reject(error);
    }

    const endTime = process.hrtime(startTime);
    const elapsedSeconds = (endTime[0]) + (endTime[1] / 1e9);
    console.log(`Build SUCCESSFUL. ${totalGeneratedResources} resources are generated. finished in ${elapsedSeconds}s.`);
}

build();
