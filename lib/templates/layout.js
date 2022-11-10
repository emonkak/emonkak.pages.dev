import { h } from 'hastscript';
import { u } from 'unist-builder';

export default function render(props) {
    return u('root', [
        u('doctype'),
        h('html', [
            h('head', [
                h('meta', { charset: 'utf-8' }),
                h('title', props.title),
                h('link', { rel: 'stylesheet', href: 'index.css' }),
            ]),
            h('body', props.body),
        ]),
    ]);
}
