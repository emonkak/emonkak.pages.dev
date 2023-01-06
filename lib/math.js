import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { mathjax } from 'mathjax-full/js/mathjax.js';

export class MathJax {
    constructor() {
        this._adaptor = liteAdaptor();
        this._htmlHandler = RegisterHTMLHandler(this._adaptor);
        this._document = mathjax.document('', {
            InputJax: new TeX({
                packages: AllPackages,
            }),
            OutputJax: new SVG({
                fontCache: 'none',
            }),
        });
    }

    convertToSvg(content) {
        const mathDocument = this._document.convert(content, {});
        return this._adaptor.innerHTML(mathDocument);
    }
}
