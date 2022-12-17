import { h } from 'hastscript';
import { toText } from 'hast-util-to-text';

import renderLayout from '../../lib/templates/layout.js';

export default function render(props) {
    const { site } = props;
    return renderLayout({
        title: 'Works',
        content: renderContent(props),
        documentPath: '/works/',
        site,
    });
}

function renderContent(props) {
    return h('main', { class: 'l-main' }, [
        h('div', { class: 'l-container' }, [
            h('div', { class: 'document' }, [
                h('h1', 'Works'),
                h('h2', 'Applications'),
                h('ul', { class: 'work-list' }, [
                    renderWork({
                        title: 'Feedpon',
                        description: [
                            'A feed reader inspired by ',
                            h('a', { href: 'https://ja.wikipedia.org/wiki/Live_Dwango_Reader', target: '_blank' }, 'Live Dwango Reader'),
                        ],
                        url: 'https://github.com/emonkak/feedpon',
                        image: {
                            src: 'https://raw.githubusercontent.com/emonkak/feedpon/master/www/img/logo.svg'
                        },
                    }),
                    renderWork({
                        title: 'GeekyTray',
                        description: [
                            'A keyboard based freedesktop.org system tray implementation for X11'
                        ],
                        url: 'https://github.com/emonkak/geekytray',
                        image: {
                            src: 'https://raw.githubusercontent.com/emonkak/geekytray/master/extras/screenshot.png',
                            style: { 'object-fit': 'cover' },
                        },
                    }),
                ]),
                h('h2', 'for Developers'),
                h('h3', 'Rust'),
                h('ul', [
                    renderWorkItem({
                        title: 'YuiUI',
                        description: ['A declarative UI framework by Rust'],
                        url: 'https://github.com/emonkak/yuiui',
                    }),
                ]),
                h('h3', 'Vim'),
                h('ul', [
                    renderWorkItem({
                        title: 'vim-accelerate',
                        description: ['Accelerate key-repeating'],
                        url: 'https://github.com/emonkak/vim-accelerate',
                    }),
                    renderWorkItem({
                        title: 'vim-operator-comment',
                        description: ['Provide operators to comment/uncomment codes'],
                        url: 'https://github.com/emonkak/vim-operator-comment',
                    }),
                    renderWorkItem({
                        title: 'vim-operator-sort',
                        description: ['Provide operators to sort segments in range'],
                        url: 'https://github.com/emonkak/vim-operator-sort',
                    }),
                    renderWorkItem({
                        title: 'vim-surround',
                        description: ['Provide simple and light-weight surround operators'],
                        url: 'https://github.com/emonkak/vim-surround',
                    }),
                ]),
                h('h3', 'JavaScript/TypeScript'),
                h('ul', [
                    renderWorkItem({
                        title: '@emonkak/di',
                        description: ['A lightweight dependency injector'],
                        url: 'https://github.com/emonkak/js-di',
                    }),
                    renderWorkItem({
                        title: '@emonkak/enumerable',
                        description: ['A implementation of LINQ to Object for JavaScript that provides the individual methods as a module'],
                        url: 'https://github.com/emonkak/js-di',
                    }),
                ]),
                h('h3', 'PHP'),
                h('ul', [
                    renderWorkItem({
                        title: 'emonkak/database',
                        description: ['A database abstraction interface as a subset of PDO'],
                        url: 'https://github.com/emonkak/php-database',
                    }),
                    renderWorkItem({
                        title: 'emonkak/date-time',
                        description: ['A date and time library that enhances build-in DateTime'],
                        url: 'https://github.com/emonkak/php-date-time',
                    }),
                    renderWorkItem({
                        title: 'emonkak/di',
                        description: ['A fast dependency injection library'],
                        url: 'https://github.com/emonkak/php-di',
                    }),
                    renderWorkItem({
                        title: 'emonkak/enumerable',
                        description: ['An implementation of LINQ to Objects for PHP'],
                        url: 'https://github.com/emonkak/php-enumerable',
                    }),
                    renderWorkItem({
                        title: 'emonkak/http-application',
                        description: ['A HTTP application core for PSR-15'],
                        url: 'https://github.com/emonkak/php-http-application',
                    }),
                    renderWorkItem({
                        title: 'emonkak/orm',
                        description: ['A strict typed Object-Relational Mapper'],
                        url: 'https://github.com/emonkak/php-random',
                    }),
                    renderWorkItem({
                        title: 'emonkak/random',
                        description: ['A random number generator library for experts'],
                        url: 'https://github.com/emonkak/php-random',
                    }),
                    renderWorkItem({
                        title: 'emonkak/router',
                        description: ['A general-purpose path routing library'],
                        url: 'https://github.com/emonkak/php-router',
                    }),
                    renderWorkItem({
                        title: 'emonkak/sharp',
                        description: [
                            '(Experimental) A memory efficient template engine compatible to Blade (',
                            h('a', { href: '/articles/2022/building-a-memory-efficient-template-engine-in-php/' }, 'Details'),
                            ')',
                        ],
                        url: 'https://github.com/emonkak/php-sharp',
                    }),
                ]),
            ]),
        ]),
    ]);
}

function renderWork(work) {
    return h('li', { class: 'work' }, [
        h('a', { class: 'work-visual', 'href': work.url, target: '_blank' }, [
            work.image && h('img', {
                class: 'work-visual-image',
                ...work.image,
            }),
        ]),
        h('div', { class: 'work-content' }, [
            h('div', { class: 'work-title', role: 'heading' }, [
                h('a', { class: 'work-title-anchor', href: work.url, target: '_blank' }, work.title),
            ]),
            h('div', { class: 'work-description' }, [
                h('p', work.description),
            ]),
        ]),
    ]);
}

function renderWorkItem(work) {
    return h('li', [
        h('a', { href: work.url, target: '_blank' }, h('strong', work.title)),
        ' — ',
        ...work.description,
    ]);
}
