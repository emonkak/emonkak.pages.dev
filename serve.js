import path from 'node:path';
import http from 'node:http';

import { ResourceLoader } from './lib/resource.js';
import { MarkdownParser } from './lib/markdown.js';
import Site from './lib/site.js';

const rootDir = path.dirname(new URL(import.meta.url).pathname);
const srcDir = path.join(rootDir, 'src');

async function serve(port, hostname) {
    const markdownParser = await MarkdownParser.create(process.env.NODE_ENV);
    const loader = new ResourceLoader(markdownParser, true);
    const resources = await loader.loadFromDirectory(srcDir);
    const site = new Site(resources, 'serve');
    const server = http.createServer(loader.createHttpHandler(site));

    server.listen(port, hostname, () => {
        const { address, port } = server.address();
        console.log(`Server running at http://${address}:${port}/`);
    });
}

serve(3000, '0.0.0.0');
