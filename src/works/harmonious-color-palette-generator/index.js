import { Chart, registerables } from 'https://cdn.skypack.dev/chart.js@4';
import { computed, signal } from 'https://cdn.skypack.dev/@preact/signals@1';
import { createContext, h, render } from 'https://cdn.skypack.dev/preact@10';
import { useCallback, useContext, useLayoutEffect, useEffect, useMemo, useRef, useState } from 'https://cdn.skypack.dev/preact@10/hooks';

import { ColorSpace, HSV, Lab, Lch, Primaries, RGB, SimpleGammaCorrection, SrgbGammaCorrection, Vec2, WhitePoint } from './color.js';

Chart.register(...registerables);

function* generatePatterns(themes, tones, colorSpace) {
    for (const theme of themes) {
        const swatches = [];

        for (const tone of tones) {
            const adaptiveColors = Array.from(enumerateAdaptedColors(theme.hue, tone.luminance, colorSpace));
            const color = minBy(adaptiveColors, (color) => {
                const { whiteness, blackness } = color.rgb.toHWB();
                const lhs = tone.colorfulness * theme.colorfulnessScale + theme.colorfulnessOffset;
                const rhs = 1 - (whiteness + blackness);
                return Math.abs(lhs - rhs);
            });
            if (color) {
                swatches.push({
                    rgb: color.rgb,
                    lch: color.lch,
                    luminance: tone.luminance,
                    colorfulness: tone.colorfulness,
                    adaptiveColors,
                });
            }
        }

        yield {
            theme,
            swatches,
        };
    }
}

function* enumerateAdaptedColors(hue, luminance, colorSpace) {
    for (let chroma = 1; chroma <= 132; chroma++) {
        const lch = new Lch(luminance, chroma / 100, hue);
        const rgb = RGB.fromXYZ(lch.toXYZ(colorSpace.whitePoint), colorSpace);

        if (!rgb.isInGamut()) {
            break;
        }

        yield { lch, rgb };
    }
}

function getContrastLevel(contrast) {
    if (contrast >= 7.0) {
        return 'AAA';
    }
    if (contrast >= 4.5) {
        return 'AA';
    }
    if (contrast >= 3.0) {
        return 'AA Large';
    }
    return 'Fail';
}

function minBy(iterable, keySelector) {
    const iterator = iterable[Symbol.iterator]();

    let value;
    let item = iterator.next();

    if (!item.done) {
        let minKey = keySelector(item.value);

        value = item.value;

        while (!(item = iterator.next()).done) {
            const key = keySelector(item.value);
            if (key <= minKey) {
                minKey = key;
                value = item.value;
            }
        }
    }

    return value;
}

function decimateArray(elements, n) {
    const head = [];
    const tail = [];
    const middle = elements.length >> 1;
    const step = Math.ceil(elements.length / n);

    for (let i = 0; i < middle; i += step)  {
        head.push(elements[i]);
    }

    for (let i = elements.length - 1; i > middle; i -= step)  {
        tail.push(elements[i]);
    }

    return head.concat(tail.reverse());
}

function shallowEqual(first, second) {
    if (first === second) {
        return true;
    }

    const firstKeys = Object.keys(first);
    const secondKeys = Object.keys(second);

    if (firstKeys.length !== secondKeys.length) {
        return false;
    }

    for (const key of firstKeys) {
        if (first[key] !== second[key]) {
            return false;
        }
    }

    return true;
}

function deepEqual(first, second) {
    if (first === second) {
        return true;
    }

    const firstKeys = Object.keys(first);
    const secondKeys = Object.keys(second);

    if (firstKeys.length !== secondKeys.length) {
        return false;
    }

    for (const key of firstKeys) {
        const firstValue = first[key];
        const secondValue = second[key];

        if (isObject(firstValue) && isObject(secondValue)) {
            if (!deepEqual(firstValue, secondValue)) {
                return false;
            }
        } else {
            if (firstValue !== secondValue) {
                return false;
            }
        }
    }

    return true;
}

function isObject(value) {
  return value != null && typeof value === 'object';
}

const State = createContext();

const Page = {
    Palette: PalettePage,
    Visualization: VisualizationPage,
    Variables: VariablesPage,
    Import: ImportPage,
};

function App(props) {
    return [
        h('aside', { class: 'l-sidebar' }, h(Sidebar)),
        h('main', { class: 'l-main' }, h(Main)),
    ];
}

function Main(props) {
    const { colorSpace, themes, tones } = useContext(State);
    const [activePage, setActivePage] = useState(() => Page.Palette);
    const patterns = useMemo(() => {
        const patterns = generatePatterns(
            themes.value.map((theme) => theme.value),
            tones.value,
            colorSpace.value,
        );
        return Array.from(patterns);
    }, [themes.value, tones.value, colorSpace.value]);

    return [
        h('div', { class: 'l-container' },
            h('nav', { class: 'nav' },
                h('div', { class: 'nav-menu' },
                    Object.keys(Page).map((key) => {
                        return h('button', {
                            class: classNames('nav-menu-item', {
                                'is-selected': Page[key] === activePage,
                            }),
                            type: 'button',
                            onclick: useCallback(() => {
                                setActivePage(() => Page[key]);
                            }, [key]),
                            key,
                        }, key);
                    }),
                ),
            ),
        ),
        h(activePage, { patterns }),
    ];
}

function PalettePage(props) {
    const { patterns } = props;
    const { colorSpace, hideColorLabels, previewInGrayscale, tones } = useContext(State);

    return [
        h('div', { class: 'l-container' },
            h('h1', {}, 'Palette'),
        ),
        h('div', {
            class: 'l-grid',
            style: {
                '--columns': tones.value.length,
                'filter': previewInGrayscale.value ? 'grayscale(1)' : 'none',
                ...hideColorLabels.value ? { '--override-fg': 'transparent' } : {},
            },
        },
            patterns.map((pattern, index) => {
                return h(Pattern, {
                    pattern,
                    colorSpace: colorSpace.value,
                    key: index,
                });
            }),
        ),
    ];
}

function VisualizationPage(props) {
    const { patterns } = props;
    const { colorSpace, tones } = useContext(State);

    return h('div', { class: 'l-container' },
        h('h1', {}, 'Generated Patterns'),
        h('h2', {}, 'Lch'),
        h('p', {},
            h(GeneratedPatternsLchChart, {
                patterns,
                colorSpace: colorSpace.value,
            }),
        ),
        h('h2', {}, 'HSV'),
        h('p', {},
            h(GeneratedPatternsHsvChart, {
                patterns,
                colorSpace: colorSpace.value,
            }),
        ),
        h('h1', {}, 'Adaptive Curves'),
        h('div', { class: 'l-grid is-gapped', style: { '--columns': '3' } },
            patterns.map((pattern) => {
                return h('p', {},
                    h('h2', {}, pattern.theme.name),
                    h(AdaptiveCurveChart, { pattern }),
                );
            }),
        ),
        h('h1', {}, 'Tones'),
        h('div', { class: 'l-grid is-gapped', style: { '--columns': '2' } },
            h('p', {},
                h(LuminancesChart, { tones: tones.value }),
            ),
            h('p', {},
                h(ColorfulnessesChart, { tones: tones.value }),
            ),
        ),
    );
}

function GeneratedPatternsLchChart(props) {
    const { patterns, colorSpace } = props;
    const datasets = useMemo(() => {
        return patterns.map(({ theme, swatches }) => {
            const midSwatch = swatches[swatches.length >> 1];
            return {
                label: theme.name,
                data: swatches.map(({ lch }) => ({
                    x: lch.hue,
                    y: lch.chroma,
                })),
                backgroundColor: midSwatch.rgb.toString(),
                borderColor: midSwatch.rgb.toString(),
                pointRadius: 5,
                borderWidth: 1,
                pointBackgroundColor(context) {
                    const index = context.dataIndex;
                    const value = context.dataset.data[index];
                    const lch = new Lch(0.5, value.y, value.x);
                    return lch.toRGB(colorSpace).toString();
                },
            };
        });
    }, [patterns, colorSpace]);
    return h(ChartJs, {
        type: 'line',
        data: { datasets },
        options: {
            animations: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'top',
                    display: true,
                    title: {
                        display: true,
                        text: 'Hue'
                    },
                    min: 0,
                    max: 360,
                },
                y: {
                    type: 'linear',
                    position: 'right',
                    display: true,
                    title: {
                        display: true,
                        text: 'Chroma'
                    },
                    min: 0.0,
                    max: 1.32,
                },
            },
        },
    });
}

function GeneratedPatternsHsvChart(props) {
    const { patterns, colorSpace } = props;
    const datasets = useMemo(() => {
        return patterns.map(({ theme, swatches }) => {
            const midSwatch = swatches[swatches.length >> 1];
            const hue = midSwatch.rgb.toHSV().hue;
            return {
                label: theme.name,
                data: swatches.map(({ rgb }) => {
                    const hsv = rgb.toHSV();
                    return {
                        x: hsv.saturation,
                        y: hsv.value,
                    };
                }),
                backgroundColor: midSwatch.rgb.toString(),
                borderColor: midSwatch.rgb.toString(),
                pointRadius: 5,
                borderWidth: 1,
                pointBackgroundColor(context) {
                    const index = context.dataIndex;
                    const value = context.dataset.data[index];
                    const hsv = new HSV(hue, value.x, value.y);
                    return hsv.toRGB().toString();
                },
            };
        });
    }, [patterns, colorSpace]);
    return h(ChartJs, {
        type: 'line',
        data: { datasets },
        options: {
            aspectRatio: 1,
            animations: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'top',
                    display: true,
                    title: {
                        display: true,
                        text: 'Saturation'
                    },
                    min: 0.0,
                    max: 1.0,
                },
                y: {
                    type: 'linear',
                    position: 'right',
                    display: true,
                    title: {
                        display: true,
                        text: 'Value'
                    },
                    min: 0.0,
                    max: 1.0,
                },
            },
        },
    });
}

function AdaptiveCurveChart(props) {
    const { pattern } = props;
    const datasets = useMemo(() => {
        const { theme, swatches } = pattern;
        return swatches.map(({ adaptiveColors, luminance }) => {
            const midSwatch = swatches[swatches.length >> 1];
            return {
                label: luminance.toFixed(2),
                data: decimateArray(adaptiveColors, 10).map((color) => {
                    const hsv = color.rgb.toHSV();
                    return {
                        x: hsv.saturation,
                        y: hsv.value,
                    };
                }),
                backgroundColor: midSwatch.rgb.toString(),
                borderColor: midSwatch.rgb.toString(),
                pointRadius: 0,
            };
        });
    }, [pattern]);
    return [
        h(ChartJs, {
            type: 'line',
            data: { datasets },
            options: {
                aspectRatio: 1,
                animations: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'top',
                        display: true,
                        title: {
                            display: true,
                            text: 'Saturation'
                        },
                        min: 0.0,
                        max: 1.0,
                    },
                    y: {
                        type: 'linear',
                        position: 'right',
                        display: true,
                        title: {
                            display: true,
                            text: 'Value'
                        },
                        min: 0.0,
                        max: 1.0,
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                },
            },
        })
    ];
}

function LuminancesChart(props) {
    const { tones } = props;
    const datasets = useMemo(() => {
        const increments = tones
            .map((tone, index) => (index > 0 ? tones[index - 1].luminance : 1) - tone.luminance);
        return [
            {
                type: 'line',
                label: 'Luminance',
                data: tones.map((tone, index) => tone.luminance),
                yAxisID: 'value',
            },
            {
                type: 'bar',
                label: 'Increment',
                data: increments,
                yAxisID: 'increment',
            },
        ];
    }, [tones]);
    return h(ChartJs, {
        data: {
            datasets,
            labels: tones.map((_, index) => index + 1),
        },
        options: {
            scales: {
                value: {
                    type: 'linear',
                    position: 'left',
                    display: true,
                    title: {
                        display: true,
                        text: 'Luminance'
                    },
                    min: 0.0,
                    max: 1.0,
                },
                increment: {
                    type: 'linear',
                    position: 'right',
                    display: true,
                    title: {
                        display: true,
                        text: 'Increment'
                    },
                },
            },
        },
    });
}

function ColorfulnessesChart(props) {
    const { tones } = props;
    const datasets = useMemo(() => {
        const increments = tones
            .map((tone, index) => tone.colorfulness - (index > 0 ? tones[index - 1].colorfulness : 0));
        return [
            {
                type: 'line',
                label: 'Colorfulness',
                data: tones.map((tone, index) => tone.colorfulness),
                yAxisID: 'value',
            },
            {
                type: 'bar',
                label: 'Increment',
                data: increments,
                yAxisID: 'increment',
            },
        ];
    }, [tones]);
    return h(ChartJs, {
        data: {
            datasets,
            labels: tones.map((_, index) => index + 1),
        },
        options: {
            scales: {
                value: {
                    type: 'linear',
                    position: 'left',
                    display: true,
                    title: {
                        display: true,
                        text: 'Colorfulness'
                    },
                    min: 0.0,
                    max: 1.0,
                },
                increment: {
                    type: 'linear',
                    position: 'right',
                    display: true,
                    title: {
                        display: true,
                        text: 'Increment'
                    },
                },
            },
        },
    });
}

function ChartJs(props) {
    const { data } = props;
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        setTimeout(() => {
            const context = canvasRef.current.getContext('2d');
            chartRef.current = new Chart(context, props);
        }, 0);
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, []);

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.data = data;
            chartRef.current.update();
        }
    }, [data]);

    return h('canvas', { ref: canvasRef });
}

function VariablesPage(props) {
    const { patterns } = props;
    const hexCodes = patterns.flatMap(({ theme, swatches }) => {
        return swatches.map(({ rgb }, index) => {
            return `--${theme.name}-${index + 1}: ${rgb.toHexString()};`;
        });
    }).join('\n');
    const rgbCodes = patterns.flatMap(({ theme, swatches }) => {
        return swatches.map(({ rgb }, index) => {
            return `--${theme.name}-${index + 1}: ${rgb};`;
        });
    }).join('\n');
    const hslCodes = patterns.flatMap(({ theme, swatches }) => {
        return swatches.map(({ rgb }, index) => {
            return `--${theme.name}-${index + 1}: ${rgb.toHSL()};`;
        });
    }).join('\n');
    return h('div', { class: 'l-container' },
        h('div', { class: 'l-grid is-gapped', style: { '--columns': 3 } },
            h('div', { class: 'l-grid-cell' },
                h('h1', {}, 'Hex'),
                h('pre', { class: 'code-block' }, h('code', {}, hexCodes)),
            ),
            h('div', { class: 'l-grid-cell' },
                h('h1', {}, 'RGB'),
                h('pre', { class: 'code-block' }, h('code', {}, rgbCodes)),
            ),
            h('div', { class: 'l-grid-cell' },
                h('h1', {}, 'HSL'),
                h('pre', { class: 'code-block' }, h('code', {}, hslCodes)),
            ),
        ),
    );
}

function ImportPage(props) {
    const state = useContext(State);
    const {
        gammaCorrection,
        importJson,
        primaries,
        themes,
        tones,
    } = state;

    return h('div', { class: 'l-container' },
        h('h1', {}, 'Import'),
        h('p', {},
            h('textarea', {
                class: 'form-control is-block',
                rows: 20,
                value: importJson.value,
                spellcheck: false,
                onchange: useCallback((event) => {
                    const value = event.target.value;
                    importJson.value = value;
                }, [importJson]),
            }),
        ),
        h('p', {},
            h('div', { class: 'form-stack is-horizontal' },
                h('button', {
                    class: 'button is-filled is-positive',
                    type: 'button',
                    onclick: useCallback(() => {
                        try {
                            const state = JSON.parse(importJson);
                            if (!state) {
                                return;
                            }
                            if (state.themes != null) {
                                themes.value = state.themes.map(signal);
                            }
                            if (state.tones != null) {
                                tones.value = state.tones;
                            }
                            if (state.primaries != null) {
                                primaries.value = state.primaries;
                            }
                            if (state.gammaCorrection != null) {
                                gammaCorrection.value = state.gammaCorrection;
                            }
                        } catch (error) {
                            alert(error);
                        }
                    }, [
                        themes,
                        tones,
                        primaries,
                    ]),
                }, 'Apply Editing State'),
                h('button', {
                    class: 'button is-outlined is-positive',
                    type: 'button',
                    onclick: useCallback(() => {
                        importJson.value = JSON.stringify({
                            themes: state.themes.value.map((theme) => theme.value),
                            tones: state.tones.value,
                            primaries: state.primaries.value,
                            gammaCorrection: state.gammaCorrection.value,
                        }, null, 2);
                    }, [state]),
                }, 'Load Current State'),
            ),
        ),
    );
}

function Pattern(props) {
    const { colorSpace, pattern } = props;

    return pattern.swatches.map(({ rgb, lch, luminance }, index) => {
        const selectSaturation = ({ saturation }) => saturation;
        const hsv = rgb.toHSV();
        const hwb = hsv.toHWB();

        let foreground;
        let contrast;

        if (luminance <= 0.5) {
            foreground = pattern.swatches[0].rgb;
            contrast = foreground.calculateContrast(rgb, colorSpace);
        } else {
            foreground = pattern.swatches[pattern.swatches.length - 1].rgb;
            contrast = rgb.calculateContrast(foreground, colorSpace);
        }

        const contrastLevel = getContrastLevel(contrast);

        return h('div', {
            class: 'swatch',
            style: {
                '--bg': hsv.toHSL().toString(),
                '--fg': foreground.toHSL().toString(),
            },
            key: index
        },
            h('div', { class: 'swatch-caption' }, `${pattern.theme.name}-${index + 1}`),
            h('div', { class: 'swatch-body' },
                h('div', {}, rgb.toString()),
                h('div', {}, hsv.toString()),
                h('div', {}, lch.toString()),
                h('div', {}, `${contrast.toFixed(2)} ${contrastLevel} (${Math.round((1 - (hwb.whiteness + hwb.blackness)) * 100)})`),
            ),
        );
    });
}

function Sidebar(props) {
    return h('div', { class: 'sidebar' },
        h('div', { class: 'sidebar-header' },
            h('div', { class: 'sidebar-logo' }, '🎨'),
            h('div', { class: 'sidebar-title', role: 'heading' }, 'Harmonious Color Palette Generator'),
        ),
        h(ThemesPanel),
        h(TonesPanel),
        h(ColorSpacePanel),
        h(OthersPanel),
    );
}

function ThemesPanel(props) {
    const { themes } = useContext(State);

    return h('div', { class: 'sidebar-panel' },
        h('div', { class: 'sidebar-panel-container' },
            h('div', { class: 'form-legend', role: 'heading' }, 'Themes'),
        ),
        h('ul', { class: 'theme-list' },
            themes.value.map((theme, index) => h(Theme, { theme, index })),
        ),
        h('div', { class: 'sidebar-panel-container' },
            h('p', {},
                h('button', {
                    class: 'button is-positive is-filled is-block',
                    type: 'button',
                    onclick: useCallback(() => {
                        const name = 'New Theme #' + (themes.value.length + 1);
                        themes.value = [...themes.value, signal({
                            name,
                            hue: 0.0,
                            colorfulnessScale: 1.0,
                            colorfulnessOffset: 0.0,
                        })];
                    }, [themes]),
                }, 'Add New Theme'),
            ),
        ),
    );
}

function Theme(props) {
    const { theme, index } = props;
    const { themes, colorSpace } = useContext(State);

    return h('details', {
        class: 'theme',
        style: {
            '--color': new Lch(
                0.5,
                1.0 * theme.value.colorfulnessScale + theme.value.colorfulnessOffset,
                theme.value.hue,
            ).toRGB(colorSpace.value).clamp(),
        }
    },
        h('summary', { class: 'theme-caption', role: 'heading' },
            h('div', { class: 'theme-name' }, theme.value.name),
        ),
        h('div', { class: 'theme-body' },
            h('div', { class: 'form-stack is-vertical' },
                h('label', { class: 'form-floating' },
                    h('span', { class: 'form-floating-label', }, 'Name'),
                    h('input', {
                        class: 'form-floating-control',
                        type: 'text',
                        value: theme.value.name,
                        onchange: useCallback((event) => {
                            const value = event.target.value;
                            theme.value = {
                                ...theme.value,
                                name: value,
                            };
                        }, [theme]),
                    }),
                ),
                h('label', { class: 'form-floating' },
                    h('span', { class: 'form-floating-label', }, 'Hue'),
                    h('input', {
                        class: 'form-floating-control',
                        type: 'number',
                        min: 0,
                        max: 359,
                        value: theme.value.hue,
                        onchange: useCallback((event) => {
                            const value = Number(event.target.value);
                            theme.value = {
                                ...theme.value,
                                hue: value,
                            };
                        }, [theme]),
                    }),
                ),
                h('label', { class: 'form-floating' },
                    h('span', { class: 'form-floating-label', }, 'Colorfulness Scale'),
                    h('input', {
                        class: 'form-floating-control',
                        type: 'number',
                        step: 0.01,
                        value: theme.value.colorfulnessScale,
                        onchange: useCallback((event) => {
                            const value = Number(event.target.value);
                            theme.value = {
                                ...theme.value,
                                colorfulnessScale: Number(value),
                            };
                        }, [theme]),
                    }),
                ),
                h('label', { class: 'form-floating' },
                    h('span', { class: 'form-floating-label', }, 'Colorfulness Offset'),
                    h('input', {
                        class: 'form-floating-control',
                        type: 'number',
                        step: 0.01,
                        value: theme.value.colorfulnessOffset,
                        onchange: useCallback((event) => {
                            const value = Number(event.target.value);
                            theme.value = {
                                ...theme.value,
                                colorfulnessOffset: Number(value),
                            };
                        }, [theme]),
                    }),
                ),
                h('button', {
                    class: 'button is-filled is-negative is-block',
                    type: 'button',
                    onclick: useCallback(() => {
                        const newThemes = themes.value.slice();
                        newThemes.splice(index, 1);
                        themes.value = newThemes;
                    }, [themes, index]),
                }, 'Remove Theme'),
            ),
        ),
    );
}

function TonesPanel(props) {
    const { tones } = useContext(State);

    return h('div', { class: 'sidebar-panel' },
        h('div', { class: 'sidebar-panel-container' },
            h('div', { class: 'form-legend', role: 'heading' }, 'Tones (Luminance / Colorfulness)'),
            h('div', { class: 'form-stack is-vertical' },
                tones.value.map((tone, index) => {
                    return h('div', { class: 'form-control-group' },
                        h('span', { class: 'form-control-addon' }, `${index + 1}`),
                        h('input', {
                            class: 'form-control',
                            type: 'number',
                            min: 0.0,
                            max: 1.0,
                            step: 0.01,
                            value: tone.luminance,
                            key: index,
                            onchange: useCallback((event) => {
                                const value = Number(event.target.value);
                                tones.value = Object.assign(tones.value.slice(), {
                                    [index]: {
                                        ...tone,
                                        luminance: value,
                                    },
                                });
                            }, [tones, index]),
                        }),
                        h('span', { class: 'form-control-addon' }, '/'),
                        h('input', {
                            class: 'form-control',
                            type: 'number',
                            min: 0.0,
                            max: 1.0,
                            step: 0.01,
                            value: tone.colorfulness,
                            key: index,
                            onchange: useCallback((event) => {
                                const value = Number(event.target.value);
                                tones.value = Object.assign(tones.value.slice(), {
                                    [index]: {
                                        ...tone,
                                        colorfulness: value,
                                    },
                                });
                            }, [tones, index]),
                        }),
                        h('button', {
                            class: 'form-control-button',
                            type: 'button',
                            onclick: useCallback(() => {
                                const newGrayTones = tones.value.slice();
                                newGrayTones.splice(index, 1);
                                tones.value = newGrayTones;
                            }, [tones, index]),
                        }, '🗑'),
                    );
                }),
                h('button', {
                    class: 'button is-outlined is-positive is-block',
                    type: 'button',
                    onclick: useCallback(() => {
                        tones.value = tones.value.slice().sort((x, y) => y.luminance - x.luminance);
                    }, [tones]),
                }, 'Sort Tones'),
                h('button', {
                    class: 'button is-filled is-positive is-block',
                    type: 'button',
                    onclick: useCallback(() => {
                        const newGrayTones = tones.value.slice();
                        newGrayTones.push({
                            luminance: 0,
                            colorfulness: 0,
                        });
                        tones.value = newGrayTones;
                    }, [tones]),
                }, 'Add New Tone'),
            ),
        ),
    );
}

function ColorSpacePanel(props) {
    const { whitePoint, primaries, gammaCorrection } = useContext(State);

    return h('div', { class: 'sidebar-panel' },
        h('div', { class: 'sidebar-panel-container' },
            h('div', { class: 'form-legend', role: 'heading' }, 'Color Space'),
            h('div', { class: 'form-stack is-vertical' },
                h('label', { class: 'form-floating' },
                    h('span', { class: 'form-floating-label', }, 'Primaries'),
                    h('select', {
                            class: 'form-floating-control',
                            onchange: useCallback((event) => {
                                const key = event.target.value;
                                primaries.value = Primaries[key];
                            }, [primaries]),
                        },
                        Array.from(Object.entries(Primaries)).map(([key, value]) => {
                            const selected = primaries.value === value;
                            return h('option', { value: key, key, selected }, key);
                        }),
                    ),
                ),
                h('label', { class: 'form-floating' },
                    h('span', { class: 'form-floating-label', }, 'WhitePoint'),
                    h('select', {
                            class: 'form-floating-control',
                            onchange: useCallback((event) => {
                                const key = event.target.value;
                                whitePoint.value = WhitePoint[key];
                            }, [whitePoint]),
                        },
                        Array.from(Object.entries(WhitePoint)).map(([key, value]) => {
                            const selected = whitePoint.value === value;
                            return h('option', { value: key, key, selected }, key);
                        }),
                    ),
                ),
                h('label', { class: 'form-floating' },
                    h('span', { class: 'form-floating-label', }, 'Gamma Value'),
                    h('input', {
                        class: 'form-floating-control',
                        type: 'number',
                        step: 0.01,
                        value: typeof gammaCorrection.value === 'string' ? 2.2 : gammaCorrection.value,
                        disabled: typeof gammaCorrection.value === 'string',
                        onchange: useCallback((event) => {
                            const value = Number(event.target.value);
                            gammaCorrection.value = value;
                        }, [gammaCorrection]),
                    }),
                ),
                h('label', { class: 'form-switch-label' },
                    h('span', {}, 'Use sRGB Gamma Correction'),
                    h('input', {
                        class: 'form-switch',
                        type: 'checkbox',
                        value: 'srgb',
                        checked: gammaCorrection.value === 'srgb',
                        onchange: useCallback((event) => {
                            const checked = event.target.checked;
                            gammaCorrection.value = checked ? event.target.value : 2.2;
                        }, [gammaCorrection]),
                    }),
                ),
            ),
        ),
    );
}

function OthersPanel(props) {
    const state = useContext(State);
    const { hideColorLabels, previewInGrayscale } = state;

    return h('div', { class: 'sidebar-panel' },
        h('div', { class: 'sidebar-panel-container' },
            h('div', { class: 'form-legend', role: 'heading' }, 'Optoins'),
            h('div', { class: 'form-stack is-vertical' },
                h('label', { class: 'form-switch-label' },
                    h('span', {}, 'Hide Color Labels'),
                    h('input', {
                        class: 'form-switch',
                        type: 'checkbox',
                        checked: hideColorLabels.value,
                        onchange: useCallback(() => {
                            hideColorLabels.value = !hideColorLabels.value;
                        }, [hideColorLabels]),
                    }),
                ),
                h('label', { class: 'form-switch-label' },
                    h('span', {}, 'Preview in Grayscale'),
                    h('input', {
                        class: 'form-switch',
                        type: 'checkbox',
                        checked: previewInGrayscale.value,
                        onchange: useCallback(() => {
                            previewInGrayscale.value = !previewInGrayscale.value;
                        }, [previewInGrayscale]),
                    }),
                ),
                h('button', {
                    class: 'button is-filled is-positive is-block',
                    type: 'button',
                    onclick: useCallback(() => {
                        resetState(state);
                    }, [state]),
                }, 'Reset to Default'),
            ),
        ),
    );
}

function classNames(...components) {
    const acc = [];
    for (const component of components) {
        normalizeClassName(component, acc)
    }
    return acc.join(' ');
}

function normalizeClassName(component, acc) {
    if (!component) {
        return;
    }
    if (typeof component === 'object') {
        if (Array.isArray(component)) {
            for (const value of component) {
                normalizeClassName(value, acc);
            }
        } else {
            for (const key in component) {
                if (component[key]) {
                    acc.push(key);
                }
            }
        }
    } else {
        acc.push(component);
    }
}

function createState() {
    const state = {
        themes: signal(initialState.themes.map(signal)),
        tones: signal(initialState.tones),
        primaries: signal(initialState.primaries),
        whitePoint: signal(initialState.whitePoint),
        gammaCorrection: signal(initialState.gammaCorrection),
        previewInGrayscale: signal(false),
        hideColorLabels: signal(false),
        importJson: signal(''),
    };

    state.colorSpace = computed(() => {
        const gammaCorrection = state.gammaCorrection.value === 'srgb' ?
            SrgbGammaCorrection :
            new SimpleGammaCorrection(state.gammaCorrection.value);
        return ColorSpace.fromChromaticities(
            state.primaries.value,
            state.whitePoint.value,
            gammaCorrection,
        );
    });

    return state;
}

function resetState(state) {
    state.themes.value = initialState.themes.map(signal);
    state.tones.value = initialState.tones;
    state.primaries.value = initialState.primaries;
    state.whitePoint.value = initialState.whitePoint;
    state.gammaCorrection.value = initialState.gammaCorrection;
    state.previewInGrayscale.value = initialState.previewInGrayscale;
    state.hideColorLabels.value = initialState.hideColorLabels;
}

const initialState = {
    themes: [
        {
            name: 'slate',
            hue: 260,
            colorfulnessScale: 0.5,
            colorfulnessOffset: 0.0,
        },
        {
            name: 'dusk',
            hue: 300,
            colorfulnessScale: 0.5,
            colorfulnessOffset: 0.0,
        },
        {
            name: 'magenta',
            hue: 0,
            colorfulnessScale: 1.0,
            colorfulnessOffset: 0.0,
        },
        {
            name: 'red',
            hue: 40,
            colorfulnessScale: 1.0,
            colorfulnessOffset: 0.0,
        },
        {
            name: 'yellow',
            hue: 80,
            colorfulnessScale: 1.0,
            colorfulnessOffset: 0.0,
        },
        {
            name: 'lime',
            hue: 120,
            colorfulnessScale: 1.0,
            colorfulnessOffset: 0.0,
        },
        {
            name: 'green',
            hue: 160,
            colorfulnessScale: 1.0,
            colorfulnessOffset: 0.0,
        },
        {
            name: 'teal',
            hue: 200,
            colorfulnessScale: 1.0,
            colorfulnessOffset: 0.0,
        },
        {
            name: 'cyan',
            hue: 240,
            colorfulnessScale: 1.0,
            colorfulnessOffset: 0.0,
        },
        {
            name: 'blue',
            hue: 280,
            colorfulnessScale: 1.0,
            colorfulnessOffset: 0.0,
        },
        {
            name: 'purple',
            hue: 320,
            colorfulnessScale: 1.0,
            colorfulnessOffset: 0.0,
        },
    ],
    tones: [
        { luminance: 0.95, colorfulness: 0.08 },
        { luminance: 0.87, colorfulness: 0.16 },
        { luminance: 0.78, colorfulness: 0.26 },
        { luminance: 0.68, colorfulness: 0.38 },
        { luminance: 0.56, colorfulness: 0.50 },
        { luminance: 0.45, colorfulness: 0.50 },
        { luminance: 0.36, colorfulness: 0.38 },
        { luminance: 0.28, colorfulness: 0.26 },
        { luminance: 0.21, colorfulness: 0.16 },
        { luminance: 0.15, colorfulness: 0.08 },
    ],
    primaries: Primaries.SRGB,
    whitePoint: WhitePoint.D65,
    gammaCorrection: 'srgb',
};

const element = h(State.Provider, { value: createState(initialState) }, h(App));

render(element, document.getElementById('root'));
