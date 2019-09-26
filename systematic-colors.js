function hsvToRgb(hsv) {  // {{{
    const [h, s, v] = hsv;

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r, g, b;

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [ 
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
    ];
}  // }}}

function rgbToHsv(rgb) {   // {{{
    const [r, g, b] = rgb;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h;
    let s = (max === 0 ? 0 : d / max);
    let v = max / 255;

    switch (max) {
        case min: h = 0; break;
        case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
        case g: h = (b - r) + d * 2; h /= 6 * d; break;
        case b: h = (r - g) + d * 4; h /= 6 * d; break;
    }

    return [h, s, v];
}  // }}}

function rgbToHex(rgb) {  // {{{
    return '#' + rgb.map((c) => ('0' + c.toString(16)).slice(-2)).join('');
}  // }}}

function hexToRgb(hex) {  // {{{
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16)
    ];
}  // }}}

function grayscaleOf(rgb) {  // {{{
    const [r, g, b] = rgb;
    const gamma = 2.2;
    // return (((r ** gamma) * 0.21267285140562253) +  // D65
    //         ((g ** gamma) * 0.715152155287818) +
    //         ((b ** gamma) * 0.07217499330655958)) ** (1 / gamma);
    return (((r ** gamma) * 0.2225044693295454) +  // D50
            ((g ** gamma) * 0.7168785945926345) +
            ((b ** gamma) * 0.06061693607782029)) ** (1 / gamma);
}  // }}}

function luminanceOf(color) {  // {{{
    return color <= 0.03928 ? color / 12.92 : Math.pow((color + 0.055) / 1.055, 2.4);
}  // }}}

function contrastBetween(rgb1, rgb2) {  // {{{
    const [r1, g1, b1] = rgb1;
    const [r2, g2, b2] = rgb2;
    const l1 = (0.2126 * luminanceOf(r1 / 255)) + (0.7152 * luminanceOf(g1 / 255)) + (0.0722 * luminanceOf(b1 / 255));
    const l2 = (0.2126 * luminanceOf(r2 / 255)) + (0.7152 * luminanceOf(g2 / 255)) + (0.0722 * luminanceOf(b2 / 255));
    return l1 > l2 ? (l1 + 0.05) / (l2 + 0.05) : (l2 + 0.05) / (l1 + 0.05);
}  // }}}

function contrastLevelOf(contrast) {  // {{{
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
}  // }}}

function distanceBetween(p1, p2) {  // {{{
    return Math.sqrt(((p2.x - p1.x) ** 2) + ((p2.y -p1.y) ** 2));
}  // }}}

function* fittedHsvColors(hue, grayscale, includeGray) {  // {{{
    for (let s = 0; s <= 100; s += 1) {
        for (let v = 0; v <= 100; v += 1) {
            const hsv = [hue, s / 100, v / 100];

            if ((includeGray || s > 0) && Math.abs(grayscaleOf(hsvToRgb(hsv)) / 255 - grayscale) < 0.01) {
                yield hsv;
            }
        }
    }
}  // }}}

function minBy(self, keySelector) {  // {{{
    const iterator = self[Symbol.iterator]();

    let result = [];
    let iteratorResult = iterator.next();

    if (!iteratorResult.done) {
        let resultKey = keySelector(iteratorResult.value);

        result.push(iteratorResult.value);

        while (!(iteratorResult = iterator.next()).done) {
            const key = keySelector(iteratorResult.value);
            if (key == resultKey) {
                result.push(iteratorResult.value);
            } else if (key < resultKey) {
                resultKey = key;
                result = [iteratorResult.value];
            }
        }
    }

    return result;
}  // }}}

function maxBy(self, keySelector) {  // {{{
    const iterator = self[Symbol.iterator]();

    let result = [];
    let iteratorResult = iterator.next();

    if (!iteratorResult.done) {
        let resultKey = keySelector(iteratorResult.value);

        result.push(iteratorResult.value);

        while (!(iteratorResult = iterator.next()).done) {
            const key = keySelector(iteratorResult.value);
            if (key == resultKey) {
                result.push(iteratorResult.value);
            } else if (key > resultKey) {
                resultKey = key;
                result = [iteratorResult.value];
            }
        }
    }

    return result;
}  // }}}

function toKebabCase(str) {
    return str.charAt(0).toLowerCase() +
        str.slice(1).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

const SATURATION_EASING = (t) => {
    if (t < 0.5) {
        return (t * 2 * (2 - t * 2));
    } else {
        return 1 - ((t - 0.5) ** 2);
    }
}
const SATURATION_EASING_FOR_BLACK = (t) => t ** 2;

const VALUE_EASING = (t) => (--t) * t * t + 1;

const RED = 3 / 360;
const GREEN = 96 / 360;
const BLUE = 204 / 360;

const COLOR_DEFINITIONS = [
        ['CoolGray',  BLUE,                              SATURATION_EASING_FOR_BLACK, 0.10, 0.20, VALUE_EASING, 1.00, 0.00],
        ['WarmGray',  RED + (GREEN - RED) / 3 * 1,       SATURATION_EASING_FOR_BLACK, 0.10, 0.20, VALUE_EASING, 1.00, 0.00],
        ['Red',       RED,                               SATURATION_EASING, 1.10, 0.10, VALUE_EASING, 1.00, 0.00],
        ['Orange',    RED + (GREEN - RED) / 3 * 1,       SATURATION_EASING, 1.10, 0.10, VALUE_EASING, 1.00, 0.00],
        ['Lime'  ,    RED + (GREEN - RED) / 3 * 2,       SATURATION_EASING, 1.10, 0.10, VALUE_EASING, 1.00, 0.00],
        ['Green',     GREEN,                             SATURATION_EASING, 1.10, 0.10, VALUE_EASING, 1.00, 0.00],
        ['Teal',      GREEN + (BLUE - GREEN) / 3 * 1.5,  SATURATION_EASING, 1.10, 0.10, VALUE_EASING, 1.00, 0.00],
        ['Cyan',      GREEN + (BLUE - GREEN) / 3 * 2.25, SATURATION_EASING, 1.10, 0.10, VALUE_EASING, 1.00, 0.00],
        ['Blue',      BLUE,                              SATURATION_EASING, 1.10, 0.10, VALUE_EASING, 1.00, 0.00],
        ['Vioret',    BLUE + (1 + RED - BLUE) / 3 * 1,   SATURATION_EASING, 1.10, 0.10, VALUE_EASING, 1.00, 0.00],
        ['Pink',      BLUE + (1 + RED - BLUE) / 3 * 2.5, SATURATION_EASING, 1.10, 0.10, VALUE_EASING, 1.00, 0.00],
    ];

const GRAYSCALES =    [0.14, 0.24, 0.34, 0.44, 0.56, 0.68, 0.78, 0.86, 0.92, 0.96].reverse();
//                         10    10    10    10    12    10    8     6     4

const DEBUG = false;

const datasets = [];
const variables = [];

let container;

if (typeof document === 'object') {
    container = document.createElement('div');
    container.className = 'container';
}

for (const [label, hue, saturationEasingFunc, saturationScale, saturationOffset, valueEasingFunc, valueScale, valueOffset] of COLOR_DEFINITIONS) {
    const data = [];

    const grayrate = (t) => grayscaleOf(hsvToRgb([hue, 1.0, t])) / 255;
    const saturationEasing = (t) => saturationEasingFunc(1 - t) * saturationScale + saturationOffset - grayrate(t);
    const valueEasing = (t) => valueEasingFunc(t) * valueScale + valueOffset;
    const fitPoints = Array.from({ length: 101 }).map((_, i) => ({
        x: Math.max(0, Math.min(1, saturationEasing(i / 100))),
        y: Math.max(0, Math.min(1, valueEasing(i / 100))),
    }));

    for (let i = 0, l = GRAYSCALES.length; i < l; i++) {
        const grayscale = GRAYSCALES[i];
        const colors = Array.from(fittedHsvColors(hue, grayscale, valueScale === 0));
        const mathchedColor = minBy(colors, ([h, s, v]) => {
            return Math.min(...fitPoints.map((fitPoint) => distanceBetween({ x: s, y: v }, fitPoint)));
        });

        const hsv = maxBy(mathchedColor, ([h, s, v]) => s)[0];
        const rgb = hsvToRgb(hsv);

        variables.push(`\$${toKebabCase(label)}-${(i + 1)}: ${rgbToHex(rgb)};`);

        data.push({
            x: Math.round(hsv[1] * 100),
            y: Math.round(hsv[2] * 100),
        });

        // for (const point of fitPoints) {
        //     data.push({
        //         x: Math.round(point.x * 100),
        //         y: Math.round(point.y * 100),
        //     });
        // }

        if (DEBUG) {
            for (const color of colors) {
                data.push({
                    x: Math.round(color[1] * 100),
                    y: Math.round(color[2] * 100),
                });
            }
        }

        if (container) {
            const textColor = i < 5 ? [0, 0, 0] : [255, 255, 255];
            const contrast = contrastBetween(rgb, textColor).toFixed(2);
            const contrastLevel = contrastLevelOf(contrast);

            const div = document.createElement('div');

            div.className = 'color';
            div.style.backgroundColor = rgbToHex(rgb);
            div.style.color = rgbToHex(textColor);

            div.innerHTML = `
                <div class="color__label">${label} ${i + 1}</div>
                <div class="color__information">
                    <div>${rgbToHex(rgb)}</div>
                    <div>rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})</div>
                    <div>hsv(${Math.round(hsv[0] * 360)}, ${Math.round(hsv[1] * 100)}, ${Math.round(hsv[2] * 100)})</div>
                    <div>${contrast} ${contrastLevel}</div>
                </div>
            `;

            container.appendChild(div);
        }
    }

    datasets.push({
        label,
        data,
        backgroundColor: rgbToHex(hsvToRgb([
            hue,
            data[5].x / 100,
            data[5].y / 100,
        ]))
    });
}

console.log(variables.join("\n"));

if (container) {
    container.addEventListener('click', function() {
        container.classList.toggle('hide-text');
    });

    document.body.appendChild(container);

    {
        const canvasContainer = document.createElement('div');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        new Chart(context, {
            type: 'line',
            data: {
                labels: COLOR_DEFINITIONS.map(([label]) => label),
                datasets: [
                    {
                        label: 'Hue',
                        data: COLOR_DEFINITIONS.map(([label, hue]) => Math.round(hue * 360)),
                        fill: false,
                        backgroundColor: '#000000'
                    }
                ]
            },
            options: {
                aspectRatio: 1,
                scales: {
                    yAxes: [{
                        ticks: {
                            max: 360,
                            min: 0,
                            stepSize: 60
                        }
                    }]
                }
            }
        });

        canvasContainer.style.width = "75vmin";
        canvasContainer.style.height = "75vmin";
        canvasContainer.style.margin = "0 auto";

        canvasContainer.appendChild(canvas);

        document.body.appendChild(canvasContainer);
    }

    {
        const canvasContainer = document.createElement('div');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        new Chart(context, {
            type: 'scatter',
            data: {
                datasets
            },
            options: {
                aspectRatio: 1,
                scales: {
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Saturation'
                        },
                        ticks: {
                            max: 100,
                            min: 0,
                        }
                    }],
                    yAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Brightness'
                        },
                        ticks: {
                            max: 100,
                            min: 0,
                        }
                    }]
                }
            }
        });

        canvasContainer.style.width = "75vmin";
        canvasContainer.style.height = "75vmin";
        canvasContainer.style.margin = "0 auto";

        canvasContainer.appendChild(canvas);

        document.body.appendChild(canvasContainer);
    }
}
