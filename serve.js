import path from 'node:path';
import http from 'node:http';

import Context from './lib/context.js';
import { loadResources, serveResources } from './lib/resource.js';

const rootDir = path.dirname(new URL(import.meta.url).pathname);
const srcDir = path.join(rootDir, 'src');

async function serve(port, hostname) {
    const resources = await loadResources(srcDir);
    const context = new Context(resources);
    const server = http.createServer(serveResources(resources, context));

    server.listen(port, hostname, () => {
        console.log(`Server running at http://${hostname}:${port}/`);
    });
}

serve(3000, '0.0.0.0');
