import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import Context from './context.js';
import { copyDirectoryContents, loadResources, writeResources } from './resource.js';

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const srcDir = path.join(rootDir, 'src');
const staticDir = path.join(rootDir, 'static');
const outputDir = path.join(rootDir, 'dist');

async function build(report) {
    await fs.mkdir(outputDir, { recursive: true });

    const resources = await loadResources(srcDir);
    const context = new Context(resources);

    await Promise.all([
        writeResources(resources, outputDir, context, report),
        copyDirectoryContents(staticDir, outputDir, report),
    ]);
}

let totalGeneratedResources = 0;

const report = (type, srcPath, distPath) => {
    const relativeSrcPath = path.relative(rootDir, srcPath);
    const relativeDistPath = path.relative(rootDir, distPath);
    console.log(`[${type}]`, relativeSrcPath, '->', relativeDistPath);
    totalGeneratedResources++;
};

const startTime = process.hrtime();

build(report)
    .then(() => {
        const endTime = process.hrtime(startTime);
        const elapsedSeconds = (endTime[0]) + (endTime[1] / 1e9);
        console.log(`Build SUCCESSFUL. ${totalGeneratedResources} resources are generated. finished in ${elapsedSeconds}s.`);
    })
    .catch((error) => {
        console.error('Build FAILED.');
        return Promise.reject(error);
    });
