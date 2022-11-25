import { h } from 'hastscript';

import layout from './layout.js';

export default function render({ resource }) {
    return layout({
        title: resource.matter.title,
        body: renderBody(resource),
    });
}

function renderBody(resource) {
    return h('article', resource.element);
}
