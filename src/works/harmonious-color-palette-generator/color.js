export const Primaries = {
    SRGB: {
        red: { x: 0.640, y: 0.330 },
        green: { x: 0.300, y: 0.600 },
        blue: { x: 0.150, y: 0.060 },
    },
    DISPLAY_P3: {
        red: { x: 0.680, y: 0.320 },
        green: { x: 0.265, y: 0.690 },
        blue: { x: 0.150, y: 0.060 },
    },
    ADOBE_RGB: {
        red: { x: 0.640, y: 0.330 },
        green: { x: 0.210, y: 0.710 },
        blue: { x: 0.150, y: 0.060 },
    },
    PRO_PHOTO_RGB: {
        red: { x: 0.734699, y: 0.265301 },
        green: { x: 0.159597, y: 0.840403 },
        blue: { x: 0.036598, y: 0.000105 },
    },
    REC_2020: {
        red: { x: 0.708, y: 0.292 },
        green: { x: 0.170, y: 0.797 },
        blue: { x: 0.131, y: 0.046 },
    },
}

export const WhitePoint = {
    D50: { x: 0.34570, y: 0.35850 },
    D65: { x: 0.31270, y: 0.32900 },
};

export class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    distance(rhs) {
        return Math.sqrt(((rhs.x - this.x) ** 2) + ((rhs.y - this.y) ** 2));
    }

    round() {
        return new Vec2(
            Math.round(this.x),
            Math.round(this.y),
        );
    }

    slope(rhs) {
        return (rhs.y - this.y) / (rhs.x - this.x);
    }

    translate(dx, dy) {
        return new Vec2(this.x + dx, this.y + dy);
    }

    rotate(radian, origin = { x: 0, y: 0 }) {
        const matrix = Mat3.translate(origin.x, origin.y)
            .mulMat(Mat3.rotate(radian))
            .mulMat(Mat3.translate(-origin.x, -origin.y));
        const { x, y } = matrix.mulVec(new Vec3(this.x, this.y, 1));
        return new Vec2(x, y);
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }
}

export class Vec3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    mulVec(rhs) {
        return new Vec3(
            this.x * rhs.x,
            this.y * rhs.y,
            this.z * rhs.z,
        );
    }

    mulScalar(rhs) {
        return new Vec3(
            this.x * rhs,
            this.y * rhs,
            this.z * rhs,
        );
    }

    divVec(rhs) {
        return new Vec3(
            this.x / rhs.x,
            this.y / rhs.y,
            this.z / rhs.z,
        );
    }

    dot(rhs) {
        return this.x * rhs.x + this.y * rhs.y + this.z * rhs.z;
    }

    cross(rhs) {
        return new Vec3(
            this.y * rhs.z - rhs.y * this.z,
            this.z * rhs.x - rhs.z * this.x,
            this.x * rhs.y - rhs.x * this.y,
        );
    }

    toString() {
        return `(${this.x}, ${this.y}, ${this.z})`;
    }
}

export class Mat3 {
    static fromComponents(x1, x2, x3, y1, y2, y3, z1, z2, z3) {
        return new Mat3(
            new Vec3(x1, x2, x3),
            new Vec3(y1, y2, y3),
            new Vec3(z1, z2, z3),
        );
    }

    static scale(sx, sy) {
        return Mat3.fromComponents(
            sx, 0, 0,
            0, sy, 0,
            0, 0, 1,
        );
    }

    static translate(dx, dy) {
        return Mat3.fromComponents(
            1, 0, dx,
            0, 1, dy,
            0, 0, 1,
        );
    }

    static rotate(radian) {
        return Mat3.fromComponents(
            Math.cos(radian), -Math.sin(radian), 0,
            Math.sin(radian), Math.cos(radian), 1,
            0, 0, 1,
        );
    }

    static skew(radian) {
        return Mat3.fromComponents(
            1, 0, 0,
            Math.tan(radian), 1, 0,
            0, 0, 1,
        );
    }

    constructor(xAxis, yAxis, zAxis) {
        this.xAxis = xAxis;
        this.yAxis = yAxis;
        this.zAxis = zAxis;
    }

    mulMat(rhs) {
        const xAxis = this.mulVec(rhs.xAxis);
        const yAxis = this.mulVec(rhs.yAxis);
        const zAxis = this.mulVec(rhs.zAxis);
        return new Mat3(xAxis, yAxis, zAxis);
    }

    mulVec(rhs) {
        const xAxis = this.xAxis.dot(rhs);
        const yAxis = this.yAxis.dot(rhs);
        const zAxis = this.zAxis.dot(rhs);
        return new Vec3(xAxis, yAxis, zAxis);
    }

    inverse() {
        const v1 = this.yAxis.cross(this.zAxis);
        const v2 = this.zAxis.cross(this.xAxis);
        const v3 = this.xAxis.cross(this.yAxis);

        const determinant = this.zAxis.dot(v3);
        const inverseDeterminant = 1.0 / determinant;

        const xAxis = v1.mulScalar(inverseDeterminant);
        const yAxis = v2.mulScalar(inverseDeterminant);
        const zAxis = v3.mulScalar(inverseDeterminant);

        return new Mat3(xAxis, yAxis, zAxis).transpose();
    }

    transpose() {
        const xAxis = new Vec3(this.xAxis.x, this.yAxis.x, this.zAxis.x);
        const yAxis = new Vec3(this.xAxis.y, this.yAxis.y, this.zAxis.y);
        const zAxis = new Vec3(this.xAxis.z, this.yAxis.z, this.zAxis.z);
        return new Mat3(xAxis, yAxis, zAxis);
    }
}

export class ColorSpace {
    static fromChromaticities(primaries, whitePoint, gammaCorrection) {
        const xyzMatrix = calculateXyzMatrix(
            tristimulus(primaries.red),
            tristimulus(primaries.blue),
            tristimulus(primaries.green),
            tristimulus(whitePoint),
        );
        const inverseXyzMatrix = xyzMatrix.inverse();
        return new ColorSpace(primaries, whitePoint, gammaCorrection, xyzMatrix, inverseXyzMatrix);
    }

    constructor(primaries, whitePoint, gammaCorrection, xyzMatrix, inverseXyzMatrix) {
        this.primaries = primaries;
        this.whitePoint = whitePoint;
        this.gammaCorrection = gammaCorrection;
        this.xyzMatrix = xyzMatrix;
        this.inverseXyzMatrix = inverseXyzMatrix;
    }
}

export class SimpleGammaCorrection {
    constructor(gamma) {
        this.gamma = gamma;
    }

    toLinear(color) {
        return color ** this.gamma;
    }

    toNonLinear(color) {
        return color ** (1 / this.gamma);
    }
}

export const SrgbGammaCorrection = {
    toLinear(color) {
        const GAMMA = 2.4;
        const LIMIT = 0.055 / (GAMMA - 1);
        const SLOPE = ((1.055 ** GAMMA) * (GAMMA - 1) ** (GAMMA - 1)) /
                      ((0.055 ** (GAMMA - 1)) * (GAMMA ** GAMMA));
        if (color <= LIMIT) {
            return color / SLOPE;
        } else {
            return ((color + 0.055) / 1.055) ** GAMMA;
        }
    },
    toNonLinear(color) {
        const GAMMA = 2.4;
        const LIMIT = ((0.055 / (GAMMA - 1) + 0.055) / 1.055) ** GAMMA;
        const SLOPE = ((1.055 ** GAMMA) * ((GAMMA - 1) ** (GAMMA - 1))) /
                      ((0.055 ** (GAMMA - 1)) * (GAMMA ** GAMMA));
        if (color <= LIMIT)  {
            return color * SLOPE;
        } else {
            return (color ** (1 / GAMMA)) * 1.055 - 0.055;
        }
    }
}

export class RGB {
    static BLACK = new RGB(0, 0, 0);

    static WHITE = new RGB(1, 1, 1);

    static fromHex(value) {
        const red = (value >> 16) / 0xff;
        const green = (value >> 8 & 0x0000ff) / 0xff;
        const blue = (value & 0x0000ff) / 0xff;
        return new RGB(red, green, blue);
    }

    static fromXYZ(components, colorSpace) {
        const { x: r, y: g, z: b } = colorSpace.inverseXyzMatrix.mulVec(components);
        return new RGB(
            colorSpace.gammaCorrection.toNonLinear(r),
            colorSpace.gammaCorrection.toNonLinear(g),
            colorSpace.gammaCorrection.toNonLinear(b),
        );
    }

    constructor(red, green, blue) {
        this.red = red;
        this.green = green;
        this.blue = blue;
    }

    isInGamut() {
        return this.red >= 0 && this.red <= 1.0 &&
               this.green >= 0 && this.green <= 1.0 &&
               this.blue >= 0 && this.blue <= 1.0;
    }

    clamp() {
        return new RGB(
            clamp(this.red, 0, 1),
            clamp(this.green, 0, 1),
            clamp(this.blue, 0, 1),
        );
    }

    calculateContrast(darkerColor, colorSpace) {
        const l1 = this.toRelativeLuminance(colorSpace);
        const l2 = darkerColor.toRelativeLuminance(colorSpace);
        return (l1 + 0.05) / (l2 + 0.05);
    }

    toLuma(colorSpace) {
        const { x, y, z } = colorSpace.xyzMatrix.yAxis;
        return this.red * x + this.green * y + this.blue * z;
    }

    toGrayscale(colorSpace) {
        const { x, y, z } = colorSpace.xyzMatrix.yAxis;
        return colorSpace.gammaCorrection.toNonLinear(this.toRelativeLuminance(colorSpace));
    }

    toRelativeLuminance(colorSpace) {
        const { x, y, z } = colorSpace.xyzMatrix.yAxis;
        return colorSpace.gammaCorrection.toLinear(this.red) * x +
            colorSpace.gammaCorrection.toLinear(this.green) * y +
            colorSpace.gammaCorrection.toLinear(this.blue) * z;
    }

    toHSV() {
        const { red: r, green: g, blue: b } = this;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const d = max - min;

        let h;
        const s = (max === 0 ? 0 : d / max);
        const v = max;

        switch (max) {
            case min:
                h = 0;
                break;
            case r:
                h = ((g - b) + d * (g < b ? 6: 0)) / (6 * d);
                break;
            case g:
                h = ((b - r) + d * 2) / (6 * d);
                break;
            case b:
                h = ((r - g) + d * 4) / (6 * d);
                break;
        }

        return new HSV(h, s, v);
    }

    toHSL() {
        return this.toHSV().toHSL();
    }

    toHWB() {
        return this.toHSV().toHWB();
    }

    toXYZ(colorSpace) {
        const r = colorSpace.gammaCorrection.toLinear(this.red);
        const g = colorSpace.gammaCorrection.toLinear(this.green);
        const b = colorSpace.gammaCorrection.toLinear(this.blue);
        return colorSpace.xyzMatrix.mulVec(new Vec3(r, g, b));
    }

    toHex() {
        return (Math.round(this.red * 0xff) << 16) +
            (Math.round(this.green * 0xff) << 8) +
            Math.round(this.blue * 0xff);
    }

    toHexString() {
        return '#' + ('00000' + this.toHex().toString(16)).slice(-6);
    }

    toString() {
        const red = Math.round(this.red * 255);
        const green = Math.round(this.green * 255);
        const blue = Math.round(this.blue * 255);
        return `rgb(${red} ${green} ${blue})`;
    }
}

export class HSV {
    constructor(hue, saturation, value) {
        this.hue = hue;
        this.saturation = saturation;
        this.value = value;
    }

    toRGB() {
        const h = this.hue;
        const s = this.saturation;
        const v = this.value;

        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        let r, g, b;

        switch (i % 6) {
            case 0:
                return new RGB(v, t, p);
            case 1:
                return new RGB(q, v, p);
            case 2:
                return new RGB(p, v, t);
            case 3:
                return new RGB(p, q, v);
            case 4:
                return new RGB(t, p, v);
            case 5:
                return new RGB(v, p, q);
        }
    }

    toHSL() {
        const l = this.value - this.value * this.saturation / 2;
        const m = Math.min(l, 1 - l);
        const s = m ? (this.value - l) / m : 0;
        return new HSL(this.hue, s, l);
    }

    toHWB() {
        const w = (1.0 - this.saturation) * this.value;
        const b = 1.0 - this.value;
        return new HWB(this.hue, w, b);
    }

    toString() {
        const hue = Math.round(this.hue * 360);
        const saturation = Math.round(this.saturation * 100);
        const value = Math.round(this.value * 100);
        return `hsv(${hue} ${saturation}% ${value}%)`;
    }
}

export class HWB {
    constructor(hue, whiteness, blackness) {
        this.hue = hue;
        this.whiteness = whiteness;
        this.blackness = blackness;
    }

    toHSV() {
        const s = 1.0 - (this.whiteness / (1.0 - this.blackness));
        const v = 1.0 - this.blackness;
        return new HSV(this.hue, s, v);
    }

    toHSL() {
        return this.toHSV().toHSL();
    }

    toString() {
        const hue = Math.round(this.hue * 360);
        const whiteness = Math.round(this.whiteness * 100);
        const blackness = Math.round(this.blackness * 100);
        return `hwb(${hue} ${whiteness}% ${blackness}%)`;
    }
}

export class HSL {
    constructor(hue, saturation, lightness) {
        this.hue = hue;
        this.saturation = saturation;
        this.lightness = lightness;
    }

    toHSV() {
        const l = this.lightness;
        const v = this.saturation * Math.min(l, 1 - l) + l;
        const s = v ? 2 - 2 * l / v : 0;
        return new HSV(this.hue, s, v);
    }

    toHWB() {
        return this.toHSV().toHWB();
    }

    toString() {
        const hue = Math.round(this.hue * 360);
        const saturation = Math.round(this.saturation * 100);
        const lightness = Math.round(this.lightness * 100);
        return `hsl(${hue} ${saturation}% ${lightness}%)`;
    }
}

export class Lab {
    static fromXYZ(components, whitePoint) {
        const f = (t) => {
            const EPS = 216 / 24389;
            if (t > EPS) {
                return t ** (1 / 3);
            } else {
                const KAPPA = 24389 / 216;
                return (KAPPA * t + 16) / 116;
            }
        };

        let { x, y, z } = components.divVec(tristimulus(whitePoint));
        x = f(x);
        y = f(y);
        z = f(z);

        return new Lab(
            1.16 * y - 0.16,
            5 * (x - y),
            2 * (y - z),
        );
    }

    static fromRGB(color, colorSpace) {
        return Lab.fromXYZ(color.toXYZ(colorSpace), colorSpace.whitePoint);
    }

    constructor(luminance, a, b) {
        this.luminance = luminance;
        this.a = a;
        this.b = b;
    }

    toLch() {
        const chroma = Math.sqrt((this.a ** 2) + (this.b ** 2));
        const hue = normalizeDegree(Math.atan2(this.b, this.a) * (180 / Math.PI));
        return new Lch(this.luminance, chroma, hue);
    }

    toXYZ(whitePoint) {
        const { luminance: l, a, b } = this;

        const f = (t) => {
            const EPS = 216 / 24389;
            if (t ** 3 > EPS) {
                return t ** 3;
            } else {
                const KAPPA = 24389 / 27;
                return (116 * t - 16) / KAPPA;
            }
        };

        const y = (l + 0.16) / 1.16;
        const x = a / 5 + y;
        const z = y - b / 2;

        return new Vec3(f(x), f(y), f(z)).mulVec(tristimulus(whitePoint));
    }

    toRGB(colorSpace) {
        return RGB.fromXYZ(this.toXYZ(colorSpace.whitePoint), colorSpace);
    }

    toString() {
        const luminance = Math.round(this.luminance * 100);
        const a = Math.round(this.a * 100);
        const b = Math.round(this.b * 100);
        return `lab(${luminance}% ${a} ${b})`;
    }
}

export class Lch {
    static fromXYZ(components, whitePoint) {
        return Lab.fromXYZ(components, whitePoint).toLch();
    }

    static fromRGB(color, colorSpace) {
        return Lab.fromRGB(color, colorSpace).toLch();
    }

    constructor(luminance, chroma, hue) {
        this.luminance = luminance;
        this.chroma = chroma;
        this.hue = hue;
    }

    toLab() {
        const radian = this.hue * Math.PI / 180;
        const a = this.chroma * Math.cos(radian);
        const b = this.chroma * Math.sin(radian);
        return new Lab(this.luminance, a, b);
    }

    toXYZ(whitePoint) {
        return this.toLab().toXYZ(whitePoint);
    }

    toRGB(colorSpace) {
        return RGB.fromXYZ(this.toLab().toXYZ(colorSpace.whitePoint), colorSpace);
    }

    toString() {
        const luminance = Math.round(this.luminance * 100);
        const chroma = Math.round(this.chroma * 100);
        const hue = Math.round(this.hue * 100) / 100;
        return `lch(${luminance}% ${chroma} ${hue})`;
    }
}

export class Oklab {
    static M1 = new Mat3(
        new Vec3(0.8189330101, 0.3618667424, -0.1288597137),
        new Vec3(0.0329845436, 0.9293118715, 0.0361456387),
        new Vec3(0.0482003018, 0.2643662691, 0.6338517070),
    );

    static M2 = new Mat3(
        new Vec3(0.2104542553, 0.7936177850, -0.0040720468),
        new Vec3(1.9779984951, -2.4285922050, 0.4505937099),
        new Vec3(0.0259040371, 0.7827717662, -0.8086757660),
    );

    static INVERSE_M1 = Oklab.M1.inverse();

    static INVERSE_M2 = Oklab.M2.inverse();

    static fromXYZ(components) {
        let { x, y, z } = Oklab.M1.mulVec(components);
        x = Math.cbrt(x);
        y = Math.cbrt(y);
        z = Math.cbrt(z);
        const coordinates = Oklab.M2.mulVec(new Vec3(x, y, z));
        return new Oklab(coordinates.x, coordinates.y, coordinates.z);
    }

    constructor(luminance, a, b) {
        this.luminance = luminance;
        this.a = a;
        this.b = b;
    }

    toOklch() {
        const chroma = Math.sqrt((this.a ** 2) + (this.b ** 2));
        const hue = Math.atan2(this.b, this.a) * (180 / Math.PI);
        return new Oklch(this.luminance, chroma, hue);
    }

    toXYZ() {
        const coordinates = new Vec3(this.luminance, this.a, this.b);
        let { x: l, y: m, z: s } = Oklab.INVERSE_M2.mulVec(coordinates);
        l = l ** 3;
        m = m ** 3;
        s = s ** 3;
        return Oklab.INVERSE_M1.mulVec(new Vec3(l, m, s));
    }

    toRGB(colorSpace) {
        return RGB.fromXYZ(this.toXYZ(), colorSpace);
    }

    toString() {
        const luminance = Math.round(this.luminance * 100);
        const a = Math.round(this.a * 100);
        const b = Math.round(this.b * 100);
        return `oklab(${luminance}% ${a} ${b})`;
    }
}

export class Oklch {
    static fromXYZ(components) {
        return Oklab.fromXYZ(components).toOklch();
    }

    constructor(luminance, chroma, hue) {
        this.luminance = luminance;
        this.chroma = chroma;
        this.hue = hue;
    }

    toOklab() {
        const radian = this.hue * Math.PI / 180;
        const a = this.chroma * Math.cos(radian);
        const b = this.chroma * Math.sin(radian);
        return new Oklab(this.luminance, a, b);
    }

    toXYZ() {
        return this.toOklab().toXYZ();
    }

    toRGB(colorSpace) {
        return RGB.fromXYZ(this.toOklab().toXYZ(), colorSpace);
    }

    toString() {
        const luminance = Math.round(this.luminance * 100);
        const chroma = Math.round(this.chroma * 100);
        const hue = Math.round(this.hue * 100) / 100;
        return `oklch(${luminance}% ${chroma} ${hue})`;
    }
}

function calculateXyzMatrix(red, blue, green, whitePoint) {
    const m = Mat3.fromComponents(
        red.x, green.x, blue.x,
        red.y, green.y, blue.y,
        red.z, green.z, blue.z,
    );
    const y = m.inverse().mulVec(whitePoint);
    return new Mat3(
        m.xAxis.mulVec(y),
        m.yAxis.mulVec(y),
        m.zAxis.mulVec(y),
    );
}

function chromaticity(components) {
    const { x, y, z } = components;
    const denominator = x + y + z;
    return {
        x: x / denominator,
        y: y / denominator,
        Y: y,
    };
}

function tristimulus(components) {
    const x = components.x / components.y;
    const y = 1.0;
    const z = (1.0 - components.x - components.y) / components.y;
    return new Vec3(x, y, z);
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function normalizeDegree(degree) {
    degree = degree % 360;
    return degree < 0 ? 360 + degree : degree;
}
