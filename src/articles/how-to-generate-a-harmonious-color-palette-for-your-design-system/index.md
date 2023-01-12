---
title: 調和の取れたカラーパレット生成をデザインシステムに向けて
date: 2023-01-12
template: article.js
language: ja
tags:
  - design
---

## はじめに

近年、サービス全体の一貫性を確保するためにデザインシステムを構築する例が多い。この時、特に難しいのがカラーパレットの設計で、その理由は以下のような要件があるからだ。

- カラーパレットは拡張可能であるべき
- それぞれの配色パターン同士で調和が取れているべき
- すべての色はアクセシビティに配慮したコントラスト比を確保できるべき

これらの要件を満たすカラーパレットをヒューリスティックに設計することは難しい。したがって、カラーパレットは何らかのアルゴリズムによって体系的に設計する必要があるだろう。

本稿では、筆者が作成した[カラーパレット生成ツール](/works/harmonious-color-palette-generator/)で使うために考えた3つのアルゴリズムについて解説する。

## 用語について

本論に入る前に用語の整理をしておく。作成したツールにおいて扱う用語の定義は以下の通りである。

- **カラーパレット:** 生成されたすべてのカラーパターンの一覧。
- **カラーパターン:** テーマとトーンの一覧の組み合わせから生成される色の一覧。
- **テーマ:** カラーパターン生成に使われる色相(Hue)などのパラメータを表すオブジェクト。
- **トーン:** カラーパターンの各色の生成に使われる輝度(Luminance)と鮮やかさ(Colorfulness)のパラメータを表すオブジェクト。

```dot カラーパレット生成の関係図
digraph {
  compound = true

  subgraph cluster_themes {
    label = "Themes"
    rank = same

    {
      theme1 [shape = record, label = "{Red|Hue: 40}"]
      theme2 [shape = record, label = "{Green|Hue: 160}"]
      theme3 [shape = record, label = "{Blue|Hue: 280}"]
      theme1 -> theme2 -> theme3 [style = invis]
    }
  }

  subgraph cluster_tones {
    label = "Tones"
    rank = same

    {
      tone1 [shape = record, label = "{Tone 1|Luminance: 0.90|Colorfulness: 0.10}"]
      tone2 [shape = record, label = "{Tone 2|Luminance: 0.50|Colorfulness: 0.50}"]
      tone3 [shape = record, label = "{Tone 3|Luminance: 0.10|Colorfulness: 0.10}"]
      tone1 -> tone2 -> tone3 [style = invis]
    }
  }

  subgraph cluster_palette {
    label = "Palette"

    subgraph cluster_pattern1 {
      label = "Pattern"
      style = dashed
      pattern1 [shape = record, label = "Red 1|Red 2|Red 3", weight = 1]
    }

    subgraph cluster_pattern2 {
      label = "Pattern"
      style = dashed
      pattern2 [shape = record, label = "Green 1|Green 2|Green 3", weight = 2]
    }

    subgraph cluster_pattern3 {
      label = "Pattern"
      style = dashed
      pattern3 [shape = record, label = "Blue 1|Blue 2|Blue 3", weight = 3]
    }

    pattern1 -> pattern2 -> pattern3 [constraint = false, style = invis]
  }

  tone2 -> pattern2 [label = " ", lhead="cluster_palette", ltail = "cluster_tones"]
  theme2 -> pattern2 [label = " ", lhead="cluster_palette", ltail = "cluster_themes"]
}
```

## 輝度からカラーパレットを生成(V1)

まず、カラーパレットを生成するための基本的なパラメータとして色相(Hue)と輝度(Luminance)を考えることができる。ここでは、色相は0〜360°の単位で表される円柱状の座標で、輝度は色をグレースケール化した時の階調を表す。グレースケール化は、WCAGのコントラスト比の算出で使われる[相対輝度](https://ja.wikipedia.org/wiki/%E7%9B%B8%E5%AF%BE%E8%BC%9D%E5%BA%A6)をガンマ補正して計算する。したがって、パターン間で輝度の階調を揃えることで、結果としてコントラスト比も(完全ではないが)揃えることができる。

> **Note:** 💡 グレースケールへの変換
>
> グレースケールへの変換はガンマ補正された非線形のRGB空間の色で実行する。最初に、RGBの各成分を線形の値に戻す。変換式はsRGBのものを使用した。
>
> $$
> \displaylines{
>   A=0.055,\Gamma=2.4\\
>   X={\frac {A}{\Gamma -1}}\fallingdotseq{0.04045}\\
>   \Phi ={\frac {(1+A)^{\Gamma }(\Gamma -1)^{\Gamma -1}}{(A^{\Gamma -1})(\Gamma ^{\Gamma })}}\fallingdotseq{12.92}\\
>   C_{\mathrm {linear} }={\begin{cases}{\frac {C_{\mathrm {sRGB} }}{\Phi}},&C_{\mathrm {sRGB} }\leq X\\\left({\frac {C_{\mathrm {sRGB} }+A}{1 + A}}\right)^{\Gamma},&C_{\mathrm {sRGB} }>X\end{cases}}
> }
> $$
>
> 続いて、線形RGB空間の各成分と、RGB/XYZ変換行列の輝度を表すY軸とのドット積を計算する。この値は相対輝度として知られる。変換行列はsRGB(D65)のものを使用した。
>
> $$
> Y=0.2126R_{\mathrm {linear}}+0.7152G_{\mathrm {linear}}+0.0722B_{\mathrm {linear}}
> $$
>
> 最後に、相対輝度を再度ガンマ補正した値をグレースケールへの変換結果としている。
> 
> $$
> \displaylines{
>   X'={\left({\frac {X+A}{1 + A}}\right)^{\Gamma}}\fallingdotseq{0.0031308}\\
>   Y'={\begin{cases}Y\Phi,&Y\leq X'\\Y^{1/\Gamma}(1+A)-A,&Y>X'\end{cases}}
> }
> $$
>
> なお、先程のグレイスケール階調はCSS Filterの`grayscale(1)`の階調とは一致しない。CSS Filterではガンマ補正された非線形のRGB値をそのままグレースケール階調に変換する[Luma](https://ja.wikipedia.org/wiki/%E3%83%AB%E3%83%BC%E3%83%9E)の値を使用している[^1]。
>
> $$
> Luma=0.2126R_{\mathrm {sRGB}}+0.7152G_{\mathrm {sRGB}}+0.0722B_{\mathrm {sRGB}}
> $$
>
> [^1]: https://www.w3.org/TR/filter-effects-1/#grayscaleEquivalent

基準となる色空間には、[HSV色空間](https://ja.wikipedia.org/wiki/HSV%E8%89%B2%E7%A9%BA%E9%96%93)を採用する。HSV色空間では色相はHue成分として指定することができるが、輝度を直接指定することはできない。したがってまずは、ある色相において輝度の条件を満たす、彩度(Saturation)と明度(Value)の組み合わせを列挙することから始める。輝度の候補としては以下の値を採用した。

$$
{L} ={\begin{pmatrix}0.95&0.87&0.78&0.68&0.56&0.45&0.36&0.28&0.21&0.15\end{pmatrix}}
$$

``` vega-lite 輝度の条件を満たす彩度と明度の組み合わせ
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      { "name": "Red(0°)", "luminance": 0.95, "hue": 0, "saturation": 0.01, "value": 0.96 },
      { "name": "Red(0°)", "luminance": 0.95, "hue": 0, "saturation": 0.06, "value": 1 },
      { "name": "Red(0°)", "luminance": 0.87, "hue": 0, "saturation": 0.01, "value": 0.88 },
      { "name": "Red(0°)", "luminance": 0.87, "hue": 0, "saturation": 0.11, "value": 0.95 },
      { "name": "Red(0°)", "luminance": 0.87, "hue": 0, "saturation": 0.17, "value": 1 },
      { "name": "Red(0°)", "luminance": 0.78, "hue": 0, "saturation": 0.01, "value": 0.79 },
      { "name": "Red(0°)", "luminance": 0.78, "hue": 0, "saturation": 0.11, "value": 0.85 },
      { "name": "Red(0°)", "luminance": 0.78, "hue": 0, "saturation": 0.21, "value": 0.93 },
      { "name": "Red(0°)", "luminance": 0.78, "hue": 0, "saturation": 0.29, "value": 1 },
      { "name": "Red(0°)", "luminance": 0.68, "hue": 0, "saturation": 0.01, "value": 0.69 },
      { "name": "Red(0°)", "luminance": 0.68, "hue": 0, "saturation": 0.11, "value": 0.74 },
      { "name": "Red(0°)", "luminance": 0.68, "hue": 0, "saturation": 0.21, "value": 0.81 },
      { "name": "Red(0°)", "luminance": 0.68, "hue": 0, "saturation": 0.31, "value": 0.88 },
      { "name": "Red(0°)", "luminance": 0.68, "hue": 0, "saturation": 0.41, "value": 0.97 },
      { "name": "Red(0°)", "luminance": 0.68, "hue": 0, "saturation": 0.45, "value": 1 },
      { "name": "Red(0°)", "luminance": 0.56, "hue": 0, "saturation": 0.01, "value": 0.56 },
      { "name": "Red(0°)", "luminance": 0.56, "hue": 0, "saturation": 0.11, "value": 0.61 },
      { "name": "Red(0°)", "luminance": 0.56, "hue": 0, "saturation": 0.21, "value": 0.67 },
      { "name": "Red(0°)", "luminance": 0.56, "hue": 0, "saturation": 0.31, "value": 0.73 },
      { "name": "Red(0°)", "luminance": 0.56, "hue": 0, "saturation": 0.41, "value": 0.8 },
      { "name": "Red(0°)", "luminance": 0.56, "hue": 0, "saturation": 0.51, "value": 0.87 },
      { "name": "Red(0°)", "luminance": 0.56, "hue": 0, "saturation": 0.61, "value": 0.94 },
      { "name": "Red(0°)", "luminance": 0.56, "hue": 0, "saturation": 0.69, "value": 1 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 0.01, "value": 0.45 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 0.11, "value": 0.49 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 0.21, "value": 0.54 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 0.31, "value": 0.58 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 0.41, "value": 0.64 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 0.51, "value": 0.7 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 0.61, "value": 0.76 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 0.71, "value": 0.82 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 0.81, "value": 0.86 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 0.91, "value": 0.89 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 1, "value": 0.91 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 0.01, "value": 0.36 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 0.11, "value": 0.39 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 0.21, "value": 0.43 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 0.31, "value": 0.47 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 0.41, "value": 0.51 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 0.51, "value": 0.56 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 0.61, "value": 0.61 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 0.71, "value": 0.66 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 0.81, "value": 0.7 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 0.91, "value": 0.72 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 1, "value": 0.74 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 0.01, "value": 0.28 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 0.11, "value": 0.31 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 0.21, "value": 0.33 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 0.31, "value": 0.36 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 0.41, "value": 0.4 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 0.51, "value": 0.44 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 0.61, "value": 0.48 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 0.71, "value": 0.51 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 0.81, "value": 0.55 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 0.91, "value": 0.57 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 1, "value": 0.58 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 0.01, "value": 0.21 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 0.11, "value": 0.23 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 0.21, "value": 0.25 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 0.31, "value": 0.27 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 0.41, "value": 0.3 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 0.51, "value": 0.33 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 0.61, "value": 0.36 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 0.71, "value": 0.39 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 0.81, "value": 0.42 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 0.91, "value": 0.44 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 1, "value": 0.45 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 0.01, "value": 0.15 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 0.11, "value": 0.16 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 0.21, "value": 0.18 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 0.31, "value": 0.2 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 0.41, "value": 0.21 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 0.51, "value": 0.24 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 0.61, "value": 0.26 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 0.71, "value": 0.28 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 0.81, "value": 0.3 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 0.91, "value": 0.32 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 1, "value": 0.34 },
      { "name": "Green(120°)", "luminance": 0.95, "hue": 120, "saturation": 0.01, "value": 0.95 },
      { "name": "Green(120°)", "luminance": 0.95, "hue": 120, "saturation": 0.11, "value": 0.98 },
      { "name": "Green(120°)", "luminance": 0.95, "hue": 120, "saturation": 0.18, "value": 1 },
      { "name": "Green(120°)", "luminance": 0.87, "hue": 120, "saturation": 0.01, "value": 0.87 },
      { "name": "Green(120°)", "luminance": 0.87, "hue": 120, "saturation": 0.11, "value": 0.9 },
      { "name": "Green(120°)", "luminance": 0.87, "hue": 120, "saturation": 0.21, "value": 0.92 },
      { "name": "Green(120°)", "luminance": 0.87, "hue": 120, "saturation": 0.31, "value": 0.94 },
      { "name": "Green(120°)", "luminance": 0.87, "hue": 120, "saturation": 0.41, "value": 0.96 },
      { "name": "Green(120°)", "luminance": 0.87, "hue": 120, "saturation": 0.51, "value": 0.97 },
      { "name": "Green(120°)", "luminance": 0.87, "hue": 120, "saturation": 0.61, "value": 0.99 },
      { "name": "Green(120°)", "luminance": 0.87, "hue": 120, "saturation": 0.69, "value": 1 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 0.01, "value": 0.78 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 0.11, "value": 0.8 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 0.21, "value": 0.82 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 0.31, "value": 0.84 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 0.41, "value": 0.86 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 0.51, "value": 0.87 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 0.61, "value": 0.89 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 0.71, "value": 0.89 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 0.81, "value": 0.9 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 0.91, "value": 0.9 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 1, "value": 0.91 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 0.01, "value": 0.68 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 0.11, "value": 0.7 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 0.21, "value": 0.72 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 0.31, "value": 0.73 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 0.41, "value": 0.75 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 0.51, "value": 0.76 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 0.61, "value": 0.77 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 0.71, "value": 0.78 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 0.81, "value": 0.79 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 0.91, "value": 0.79 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 1, "value": 0.79 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 0.01, "value": 0.56 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 0.11, "value": 0.58 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 0.21, "value": 0.59 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 0.31, "value": 0.61 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 0.41, "value": 0.62 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 0.51, "value": 0.63 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 0.61, "value": 0.64 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 0.71, "value": 0.64 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 0.81, "value": 0.65 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 0.91, "value": 0.65 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 1, "value": 0.65 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 0.01, "value": 0.45 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 0.11, "value": 0.46 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 0.21, "value": 0.48 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 0.31, "value": 0.49 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 0.41, "value": 0.5 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 0.51, "value": 0.51 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 0.61, "value": 0.51 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 0.71, "value": 0.52 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 0.81, "value": 0.52 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 0.91, "value": 0.52 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 1, "value": 0.53 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 0.01, "value": 0.36 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 0.11, "value": 0.37 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 0.21, "value": 0.38 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 0.31, "value": 0.39 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 0.41, "value": 0.4 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 0.51, "value": 0.4 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 0.61, "value": 0.41 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 0.71, "value": 0.41 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 0.81, "value": 0.42 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 0.91, "value": 0.42 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 1, "value": 0.42 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 0.01, "value": 0.28 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 0.11, "value": 0.29 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 0.21, "value": 0.3 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 0.31, "value": 0.3 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 0.41, "value": 0.31 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 0.51, "value": 0.32 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 0.61, "value": 0.32 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 0.71, "value": 0.32 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 0.81, "value": 0.33 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 0.91, "value": 0.33 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 1, "value": 0.33 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 0.01, "value": 0.21 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 0.11, "value": 0.22 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 0.21, "value": 0.22 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 0.31, "value": 0.23 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 0.41, "value": 0.23 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 0.51, "value": 0.24 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 0.61, "value": 0.24 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 0.71, "value": 0.24 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 0.81, "value": 0.25 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 0.91, "value": 0.25 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 1, "value": 0.25 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 0.01, "value": 0.15 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 0.11, "value": 0.15 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 0.21, "value": 0.16 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 0.31, "value": 0.16 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 0.41, "value": 0.17 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 0.51, "value": 0.17 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 0.61, "value": 0.17 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 0.71, "value": 0.17 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 0.81, "value": 0.18 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 0.91, "value": 0.18 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 1, "value": 0.18 },
      { "name": "Blue(240°)", "luminance": 0.95, "hue": 240, "saturation": 0.01, "value": 0.96 },
      { "name": "Blue(240°)", "luminance": 0.95, "hue": 240, "saturation": 0.05, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.87, "hue": 240, "saturation": 0.01, "value": 0.88 },
      { "name": "Blue(240°)", "luminance": 0.87, "hue": 240, "saturation": 0.11, "value": 0.97 },
      { "name": "Blue(240°)", "luminance": 0.87, "hue": 240, "saturation": 0.14, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.78, "hue": 240, "saturation": 0.01, "value": 0.79 },
      { "name": "Blue(240°)", "luminance": 0.78, "hue": 240, "saturation": 0.11, "value": 0.87 },
      { "name": "Blue(240°)", "luminance": 0.78, "hue": 240, "saturation": 0.21, "value": 0.97 },
      { "name": "Blue(240°)", "luminance": 0.78, "hue": 240, "saturation": 0.24, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.68, "hue": 240, "saturation": 0.01, "value": 0.69 },
      { "name": "Blue(240°)", "luminance": 0.68, "hue": 240, "saturation": 0.11, "value": 0.76 },
      { "name": "Blue(240°)", "luminance": 0.68, "hue": 240, "saturation": 0.21, "value": 0.84 },
      { "name": "Blue(240°)", "luminance": 0.68, "hue": 240, "saturation": 0.31, "value": 0.95 },
      { "name": "Blue(240°)", "luminance": 0.68, "hue": 240, "saturation": 0.36, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.56, "hue": 240, "saturation": 0.01, "value": 0.57 },
      { "name": "Blue(240°)", "luminance": 0.56, "hue": 240, "saturation": 0.11, "value": 0.62 },
      { "name": "Blue(240°)", "luminance": 0.56, "hue": 240, "saturation": 0.21, "value": 0.69 },
      { "name": "Blue(240°)", "luminance": 0.56, "hue": 240, "saturation": 0.31, "value": 0.78 },
      { "name": "Blue(240°)", "luminance": 0.56, "hue": 240, "saturation": 0.41, "value": 0.89 },
      { "name": "Blue(240°)", "luminance": 0.56, "hue": 240, "saturation": 0.5, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.45, "hue": 240, "saturation": 0.01, "value": 0.45 },
      { "name": "Blue(240°)", "luminance": 0.45, "hue": 240, "saturation": 0.11, "value": 0.5 },
      { "name": "Blue(240°)", "luminance": 0.45, "hue": 240, "saturation": 0.21, "value": 0.56 },
      { "name": "Blue(240°)", "luminance": 0.45, "hue": 240, "saturation": 0.31, "value": 0.63 },
      { "name": "Blue(240°)", "luminance": 0.45, "hue": 240, "saturation": 0.41, "value": 0.71 },
      { "name": "Blue(240°)", "luminance": 0.45, "hue": 240, "saturation": 0.51, "value": 0.82 },
      { "name": "Blue(240°)", "luminance": 0.45, "hue": 240, "saturation": 0.61, "value": 0.95 },
      { "name": "Blue(240°)", "luminance": 0.45, "hue": 240, "saturation": 0.64, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.36, "hue": 240, "saturation": 0.01, "value": 0.36 },
      { "name": "Blue(240°)", "luminance": 0.36, "hue": 240, "saturation": 0.11, "value": 0.4 },
      { "name": "Blue(240°)", "luminance": 0.36, "hue": 240, "saturation": 0.21, "value": 0.45 },
      { "name": "Blue(240°)", "luminance": 0.36, "hue": 240, "saturation": 0.31, "value": 0.5 },
      { "name": "Blue(240°)", "luminance": 0.36, "hue": 240, "saturation": 0.41, "value": 0.57 },
      { "name": "Blue(240°)", "luminance": 0.36, "hue": 240, "saturation": 0.51, "value": 0.66 },
      { "name": "Blue(240°)", "luminance": 0.36, "hue": 240, "saturation": 0.61, "value": 0.76 },
      { "name": "Blue(240°)", "luminance": 0.36, "hue": 240, "saturation": 0.71, "value": 0.89 },
      { "name": "Blue(240°)", "luminance": 0.36, "hue": 240, "saturation": 0.79, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 0.01, "value": 0.28 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 0.11, "value": 0.31 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 0.21, "value": 0.35 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 0.31, "value": 0.39 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 0.41, "value": 0.44 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 0.51, "value": 0.51 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 0.61, "value": 0.6 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 0.71, "value": 0.7 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 0.81, "value": 0.81 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 0.91, "value": 0.9 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 1, "value": 0.95 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 0.01, "value": 0.21 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 0.11, "value": 0.23 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 0.21, "value": 0.26 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 0.31, "value": 0.29 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 0.41, "value": 0.33 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 0.51, "value": 0.38 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 0.61, "value": 0.45 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 0.71, "value": 0.53 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 0.81, "value": 0.62 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 0.91, "value": 0.69 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 1, "value": 0.74 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 0.01, "value": 0.15 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 0.11, "value": 0.17 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 0.21, "value": 0.19 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 0.31, "value": 0.21 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 0.41, "value": 0.24 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 0.51, "value": 0.28 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 0.61, "value": 0.32 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 0.71, "value": 0.38 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 0.81, "value": 0.45 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 0.91, "value": 0.51 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 1, "value": 0.56 }
    ]
  },
  "mark": {
    "type": "line"
  },
  "encoding": {
    "x": {
      "field": "saturation",
      "title": "Saturation",
      "type": "quantitative",
      "scale": {
        "domainMin": 0,
        "domainMax": 1
      }
    },
    "y": {
      "field": "value",
      "title": "Value",
      "type": "quantitative",
      "scale": {
        "domainMin": 0,
        "domainMax": 1
      }
    },
    "color": {
      "field": "name",
      "title": null,
      "type": "nominal",
      "scale": {
        "range": ["red", "green", "blue"]
      },
      "sort": {
        "field": "hue"
      }
    },
    "detail": {
      "field": "luminance",
      "type": "quantitative"
    }
  }
}
```

上の図から、輝度の条件を満たすの曲線(以降、輝度適応曲線と呼ぶ)は色相によって傾きが異なることがわかる。青の傾きが最も大きく曲線で、緑は低輝度においてはほぼ直線になる。ここからそれぞれの適応曲線上の位置Tの色を選んでカラーパレットを生成してみる。位置Tは輝度ごとに以下の値とした。

$$
T={\begin{pmatrix}0.96&0.92&0.88&0.84&0.80&0.76&0.72&0.68&0.64&0.60\end{pmatrix}}
$$

表の各項右の数値は左から順に黒(#000)と白(#FFF)に対するWCAGのコントラスト比、輝度、後述する視覚上の鮮やかさを表すColorfulnessを示す。

``` html-figure 輝度の条件を満たす曲線から任意の位置Tを選択したカラーパレット(V1)
<table style="min-width: 100%; white-space: nowrap">
  <tr>
    <td style="background-color: hsl(0 100% 97%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 1</span><span>1:18.94/L95/C6</span></div></td>
    <td style="background-color: hsl(120 100% 91%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 1</span><span>1:18.94/L95/C18</span></div></td>
    <td style="background-color: hsl(240 100% 98%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 1</span><span>1:18.96/L95/C5</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 89% 91%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 2</span><span>1:15.53/L87/C16</span></div></td>
    <td style="background-color: hsl(120 97% 67%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 2</span><span>1:15.57/L87/C63</span></div></td>
    <td style="background-color: hsl(240 87% 93%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 2</span><span>1:15.64/L87/C13</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 81% 84%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 3</span><span>1:12.43/L78/C25</span></div></td>
    <td style="background-color: hsl(120 80% 50%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 3</span><span>1:12.32/L78/C80</span></div></td>
    <td style="background-color: hsl(240 84% 87%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 3</span><span>1:12.50/L78/C22</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 75% 76%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 4</span><span>1:9.40/L68/C36</span></div></td>
    <td style="background-color: hsl(120 74% 45%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 4</span><span>1:9.47/L68/C67</span></div></td>
    <td style="background-color: hsl(240 75% 80%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 4</span><span>1:9.47/L68/C29</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 74% 66%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 5</span><span>1:6.53/L56/C51</span></div></td>
    <td style="background-color: hsl(120 68% 39%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 5</span><span>1:6.52/L56/C53</span></div></td>
    <td style="background-color: hsl(240 62% 71%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 5</span><span>1:6.53/L56/C36</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 69% 52%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 6</span><span>4.73:1/L45/C65</span></div></td>
    <td style="background-color: hsl(120 63% 32%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 6</span><span>4.76:1/L45/C40</span></div></td>
    <td style="background-color: hsl(240 49% 60%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 6</span><span>4.73:1/L45/C39</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 57% 43%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 7</span><span>6.64:1/L36/C49</span></div></td>
    <td style="background-color: hsl(120 57% 27%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 7</span><span>6.61:1/L36/C31</span></div></td>
    <td style="background-color: hsl(240 42% 51%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 7</span><span>6.69:1/L36/C41</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 53% 33%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 8</span><span>9.17:1/L28/C35</span></div></td>
    <td style="background-color: hsl(120 53% 21%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 8</span><span>9.33:1/L28/C22</span></div></td>
    <td style="background-color: hsl(240 53% 45%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 8</span><span>9.19:1/L28/C47</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 48% 25%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 9</span><span>12.21:1/L21/C24</span></div></td>
    <td style="background-color: hsl(120 48% 16%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 9</span><span>12.24:1/L21/C16</span></div></td>
    <td style="background-color: hsl(240 48% 32%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 9</span><span>12.15:1/L21/C31</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 44% 18%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 10</span><span>15.05:1/L15/C16</span></div></td>
    <td style="background-color: hsl(120 44% 12%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 10</span><span>15.19:1/L15/C10</span></div></td>
    <td style="background-color: hsl(240 44% 22%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 10</span><span>15.15:1/L15/C20</span></div></td>
  </tr>
</table>
```

それぞれの色相のカラーパターンは、輝度の階調が一致するものを選んだので、想定通りコンスラスト比もある程度は揃っているのがわかる。一方で、緑のパターンの低輝度の部分は特に、他と比べて鮮かに際立ってって見える。これは緑の場合の輝度適応曲線の傾きが小さいため、高彩度の色が選ばれてしまうからだ。このことはカラーパレットをHSV空間の彩度と明度にマッピングした以下の図から読み取れる。

``` vega-lite カラーパターン(V1)のHSV色空間における彩度と明度
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      { "name": "Red(0°)", "luminance": 0.95, "hue": 0, "saturation": 0.06, "value": 1 },
      { "name": "Red(0°)", "luminance": 0.87, "hue": 0, "saturation": 0.16, "value": 0.99 },
      { "name": "Red(0°)", "luminance": 0.78, "hue": 0, "saturation": 0.26, "value": 0.97 },
      { "name": "Red(0°)", "luminance": 0.68, "hue": 0, "saturation": 0.38, "value": 0.94 },
      { "name": "Red(0°)", "luminance": 0.56, "hue": 0, "saturation": 0.56, "value": 0.91 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 0.77, "value": 0.85 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 0.73, "value": 0.67 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 0.69, "value": 0.51 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 0.65, "value": 0.37 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 0.61, "value": 0.26 },
      { "name": "Green(120°)", "luminance": 0.95, "hue": 120, "saturation": 0.18, "value": 1 },
      { "name": "Green(120°)", "luminance": 0.87, "hue": 120, "saturation": 0.64, "value": 0.99 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 0.89, "value": 0.9 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 0.85, "value": 0.79 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 0.81, "value": 0.65 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 0.77, "value": 0.52 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 0.73, "value": 0.42 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 0.69, "value": 0.32 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 0.65, "value": 0.24 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 0.61, "value": 0.17 },
      { "name": "Blue(240°)", "luminance": 0.95, "hue": 240, "saturation": 0.05, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.87, "hue": 240, "saturation": 0.13, "value": 0.99 },
      { "name": "Blue(240°)", "luminance": 0.78, "hue": 240, "saturation": 0.22, "value": 0.98 },
      { "name": "Blue(240°)", "luminance": 0.68, "hue": 240, "saturation": 0.31, "value": 0.95 },
      { "name": "Blue(240°)", "luminance": 0.56, "hue": 240, "saturation": 0.41, "value": 0.89 },
      { "name": "Blue(240°)", "luminance": 0.45, "hue": 240, "saturation": 0.49, "value": 0.8 },
      { "name": "Blue(240°)", "luminance": 0.36, "hue": 240, "saturation": 0.57, "value": 0.72 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 0.69, "value": 0.68 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 0.65, "value": 0.48 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 0.61, "value": 0.32 }
    ]
  },
  "mark": {
    "type": "point"
  },
  "encoding": {
    "x": {
      "field": "saturation",
      "title": "Saturation",
      "type": "quantitative",
      "scale": {
        "domainMin": 0,
        "domainMax": 1
      }
    },
    "y": {
      "field": "value",
      "title": "Value",
      "type": "quantitative",
      "scale": {
        "domainMin": 0,
        "domainMax": 1
      }
    },
    "color": {
      "field": "name",
      "title": null,
      "type": "nominal",
      "scale": {
        "range": ["red", "green", "blue"]
      },
      "sort": {
        "field": "hue"
      }
    }
  }
}
```

では、色相によって視覚上の鮮かさが異なってしまう問題は、どのように解決すればいいだろうか？まず考えたのは輝度適応曲線の傾きによって、位置Tを補正することだ。結論から言うとこの方法は採用しなかった。なぜなら、そもそも補正値をどのような値にすべきか、さらに低輝度の場合と高輝度の場合で補正の方向を変化させなければならない(傾きが小さい色の彩度を抑える方向で補正すると、今度は逆に高輝度で傾きの色の視覚的な鮮かさが相対的に大きくなってしまう)等、パラメータの調整が難しかったからだ。

そこで考えたのが、視覚上の鮮やかさを数値化して輝度と同様に揃える方法だ。

## 輝度と視覚上の鮮やかさからカラーパレットを生成(V2)

視覚上の鮮やかさ(以降Colorfulness)とは本稿で独自に定義する数値で、HSV色空間のSaturationとは異なる。具体的には、[HWB色空間](https://en.wikipedia.org/wiki/HWB_color_model)におけるWhiteness成分とBlackness成分を足した値を1から引いたものをColorfulnessとしている。Colorfulnessは0〜1までの数値を取り、1に近付くにつれより視覚的に鮮やかに見えるようになる。計算式は以下の通りとなる。

$$
{\begin{aligned}
  W&=(1-S)V\\B&=(1-V)\\C&=1-(W+B)
\end{aligned}}
$$

Colorfulnessの例として、HSV色空間でSaturationを1で固定、Valueを1〜0.1まで変化させた場合、その値は以下の表のようになる。表の各項の左側がHSVの各成分で、右側がColorfulnessになっている。ここから、確かにColorfulnessが視覚上の鮮やかさと一致しているのがわかる。

``` html-figure HSV色空間において彩度が同一で明度のみが異なる場合のColorfulness
<table style="min-width: 100%; white-space: nowrap">
  <tr>
    <td style="background-color: hsl(0 100% 50%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H0 S100 V100</span><span>100</span></div></td>
    <td style="background-color: hsl(120 100% 50%); color: black"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H120 S100 V100</span><span>100</span></div></td>
    <td style="background-color: hsl(240 100% 50%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H240 S100 V100</span><span>100</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 100% 45%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H0 S100 V90</span><span>90</span></div></td>
    <td style="background-color: hsl(120 100% 45%); color: black"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H120 S100 V90</span><span>90</span></div></td>
    <td style="background-color: hsl(240 100% 45%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H240 S100 V90</span><span>90</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 100% 40%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H0 S100 V80</span><span>80</span></div></td>
    <td style="background-color: hsl(120 100% 40%); color: black"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H120 S100 V80</span><span>80</span></div></td>
    <td style="background-color: hsl(240 100% 40%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H240 S100 V80</span><span>80</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 100% 35%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H0 S100 V70</span><span>70</span></div></td>
    <td style="background-color: hsl(120 100% 35%); color: black"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H120 S100 V70</span><span>70</span></div></td>
    <td style="background-color: hsl(240 100% 35%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H240 S100 V70</span><span>70</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 100% 30%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H0 S100 V60</span><span>60</span></div></td>
    <td style="background-color: hsl(120 100% 30%); color: black"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H120 S100 V60</span><span>60</span></div></td>
    <td style="background-color: hsl(240 100% 30%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H240 S100 V60</span><span>60</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 100% 25%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H0 S100 V50</span><span>50</span></div></td>
    <td style="background-color: hsl(120 100% 25%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H120 S100 V50</span><span>50</span></div></td>
    <td style="background-color: hsl(240 100% 25%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H240 S100 V50</span><span>50</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 100% 20%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H0 S100 V40</span><span>40</span></div></td>
    <td style="background-color: hsl(120 100% 20%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H120 S100 V40</span><span>40</span></div></td>
    <td style="background-color: hsl(240 100% 20%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H240 S100 V40</span><span>40</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 100% 15%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H0 S100 V30</span><span>30</span></div></td>
    <td style="background-color: hsl(120 100% 15%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H120 S100 V30</span><span>30</span></div></td>
    <td style="background-color: hsl(240 100% 15%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H240 S100 V30</span><span>30</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 100% 10%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H0 S100 V20</span><span>20</span></div></td>
    <td style="background-color: hsl(120 100% 10%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H120 S100 V20</span><span>20</span></div></td>
    <td style="background-color: hsl(240 100% 10%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H240 S100 V20</span><span>20</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 100% 5%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H0 S100 V10</span><span>10</span></div></td>
    <td style="background-color: hsl(120 100% 5%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H120 S100 V10</span><span>10</span></div></td>
    <td style="background-color: hsl(240 100% 5%); color: white"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>H240 S100 V10</span><span>10</span></div></td>
  </tr>
</table>
```

では、実際に輝度とColorfulnessを使ってカラーパレットを生成することを考える。それには、先程の輝度適応曲線はそのまま使って、目標とするColorfulnessに最も近い値が得られる位置Tを選択すればいい。Colorfulnessの候補としては以下の値を採用した。

$$
C={\begin{pmatrix}0.08&0.16&0.26&0.38&0.50&0.50&0.38&0.26&0.16&0.08\end{pmatrix}}
$$

これらColorfulnessの候補から生成したカラーパレットが以下の表だ。

``` html-figure 輝度適応曲線からColorfulnessが任意の値に近い位置を選択したカラーパレット(V2)
<table style="min-width: 100%; white-space: nowrap">
  <tr>
    <td style="background-color: hsl(0 100% 97%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 1</span><span>1:18.94/L95/C6</span></div></td>
    <td style="background-color: hsl(120 56% 93%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 1</span><span>1:18.75/L95/C8</span></div></td>
    <td style="background-color: hsl(240 100% 98%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 1</span><span>1:18.96/L95/C5</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 89% 91%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 2</span><span>1:15.53/L87/C16</span></div></td>
    <td style="background-color: hsl(120 48% 83%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 2</span><span>1:15.49/L87/C16</span></div></td>
    <td style="background-color: hsl(240 100% 93%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 2</span><span>1:15.63/L87/C14</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 87% 85%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 3</span><span>1:12.47/L78/C26</span></div></td>
    <td style="background-color: hsl(120 45% 71%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 3</span><span>1:12.32/L78/C26</span></div></td>
    <td style="background-color: hsl(240 100% 88%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 3</span><span>1:12.43/L78/C24</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 83% 77%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 4</span><span>1:9.46/L68/C38</span></div></td>
    <td style="background-color: hsl(120 44% 57%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 4</span><span>1:9.38/L68/C38</span></div></td>
    <td style="background-color: hsl(240 100% 82%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 4</span><span>1:9.26/L68/C36</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 71% 65%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 5</span><span>1:6.50/L56/C50</span></div></td>
    <td style="background-color: hsl(120 63% 40%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 5</span><span>1:6.55/L56/C50</span></div></td>
    <td style="background-color: hsl(240 100% 75%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 5</span><span>1:6.42/L56/C50</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 53% 53%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 6</span><span>4.73:1/L45/C50</span></div></td>
    <td style="background-color: hsl(120 90% 27%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 6</span><span>4.83:1/L45/C49</span></div></td>
    <td style="background-color: hsl(240 67% 63%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 6</span><span>4.79:1/L45/C49</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 45% 42%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 7</span><span>6.78:1/L36/C38</span></div></td>
    <td style="background-color: hsl(120 82% 23%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 7</span><span>6.72:1/L36/C38</span></div></td>
    <td style="background-color: hsl(240 39% 51%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 7</span><span>6.67:1/L36/C39</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 40% 33%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 8</span><span>9.25:1/L28/C26</span></div></td>
    <td style="background-color: hsl(120 65% 20%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 8</span><span>9.11:1/L28/C26</span></div></td>
    <td style="background-color: hsl(240 34% 38%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 8</span><span>9.27:1/L28/C26</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 32% 24%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 9</span><span>12.25:1/L21/C16</span></div></td>
    <td style="background-color: hsl(120 50% 16%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 9</span><span>12.27:1/L21/C16</span></div></td>
    <td style="background-color: hsl(240 29% 27%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 9</span><span>12.23:1/L21/C16</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(0 23% 17%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 10</span><span>15.04:1/L15/C8</span></div></td>
    <td style="background-color: hsl(120 31% 13%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 10</span><span>15.01:1/L15/C8</span></div></td>
    <td style="background-color: hsl(240 22% 18%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 10</span><span>15.18:1/L15/C8</span></div></td>
  </tr>
</table>
```

このカラーパレットは最初のものとは違って、輝度だけではなくColorfulnessの値も揃っているのがわかる。その結果、視覚的に調和が取れた理想的なものすることができた。

このカラーパレットを前節と同じくHSV色空間の彩度と明度にマッピングすると以下の図になる。これを見ると輝度適応曲線の傾きを考慮して、上手く補正されているのがわかる。

``` vega-lite カラーパターン(V2)のHSV色空間における彩度と明度
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      { "name": "Red(0°)", "luminance": 0.95, "hue": 0, "saturation": 0.06, "value": 1 },
      { "name": "Red(0°)", "luminance": 0.87, "hue": 0, "saturation": 0.16, "value": 0.99 },
      { "name": "Red(0°)", "luminance": 0.78, "hue": 0, "saturation": 0.27, "value": 0.98 },
      { "name": "Red(0°)", "luminance": 0.68, "hue": 0, "saturation": 0.4, "value": 0.96 },
      { "name": "Red(0°)", "luminance": 0.56, "hue": 0, "saturation": 0.55, "value": 0.9 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 0, "saturation": 0.64, "value": 0.78 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 0, "saturation": 0.62, "value": 0.61 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 0, "saturation": 0.57, "value": 0.46 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 0, "saturation": 0.49, "value": 0.32 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 0, "saturation": 0.38, "value": 0.21 },
      { "name": "Green(120°)", "luminance": 0.95, "hue": 120, "saturation": 0.08, "value": 0.97 },
      { "name": "Green(120°)", "luminance": 0.87, "hue": 120, "saturation": 0.18, "value": 0.91 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 120, "saturation": 0.31, "value": 0.84 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 120, "saturation": 0.5, "value": 0.76 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 120, "saturation": 0.77, "value": 0.65 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 120, "saturation": 0.95, "value": 0.52 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 120, "saturation": 0.9, "value": 0.42 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 120, "saturation": 0.79, "value": 0.33 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 120, "saturation": 0.67, "value": 0.24 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 120, "saturation": 0.47, "value": 0.17 },
      { "name": "Blue(240°)", "luminance": 0.95, "hue": 240, "saturation": 0.05, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.87, "hue": 240, "saturation": 0.14, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.78, "hue": 240, "saturation": 0.24, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.68, "hue": 240, "saturation": 0.36, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.56, "hue": 240, "saturation": 0.5, "value": 1 },
      { "name": "Blue(240°)", "luminance": 0.45, "hue": 240, "saturation": 0.56, "value": 0.88 },
      { "name": "Blue(240°)", "luminance": 0.36, "hue": 240, "saturation": 0.55, "value": 0.7 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 240, "saturation": 0.51, "value": 0.51 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 240, "saturation": 0.45, "value": 0.35 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 240, "saturation": 0.36, "value": 0.22 }
    ]
  },
  "mark": {
    "type": "point"
  },
  "encoding": {
    "x": {
      "field": "saturation",
      "title": "Saturation",
      "type": "quantitative",
      "scale": {
        "domainMin": 0,
        "domainMax": 1
      }
    },
    "y": {
      "field": "value",
      "title": "Value",
      "type": "quantitative",
      "scale": {
        "domainMin": 0,
        "domainMax": 1
      }
    },
    "color": {
      "field": "name",
      "title": null,
      "type": "nominal",
      "scale": {
        "range": ["red", "green", "blue"]
      },
      "sort": {
        "field": "hue"
      }
    }
  }
}
```

## Lch色空間を利用してカラーパレットを生成(V3)

前節の方法で既に完成系となるカラーパレットを作ることはできたが、別解としてLch色空間を使う方法もある。

Lch色空間を使うことで輝度はLuminance成分(前節で使っていたグレースケール階調とはわずかに異なる)を、色相はHue成分をそのまま使用できる。したがって、LuminanceとHueは定数になるので、カラーパターンの色を選択をColorfulnessが任意の値を取るChromaを見付けるということに集約できる(Colorfulnessを得るためにHWB色空間への変換が必要となるのでこの点は面倒だが)。さらに、Lch色空間を使うことで色相をより人間の視覚に近似した形で選択できるようになる(HSV色空間のHue成分は緑の範囲が広く見える等、人間の視覚的に均一ではない)。

この方法で作成したカラーパレットは以下のようになる。なお、Hue成分はHSV色空間の場合と近似するように調整してある。前節の結果と大きな変化はないが、HSV色空間で見た時に、同じパターンの色同士のHue成分がわずかに異なるという違いがある。

``` html-figure Lch色空間を利用したカラーパレット(V3)
<table style="min-width: 100%; white-space: nowrap">
  <tr>
    <td style="background-color: hsl(4 88% 96%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 1</span><span>1:18.52/L95/C8</span></div></td>
    <td style="background-color: hsl(111 52% 92%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 1</span><span>1:18.52/L95/C8</span></div></td>
    <td style="background-color: hsl(251 98% 97%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 1</span><span>1:18.52/L95/C8</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(3 73% 89%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 2</span><span>1:15.00/L87/C16</span></div></td>
    <td style="background-color: hsl(112 43% 81%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 2</span><span>1:15.00/L87/C16</span></div></td>
    <td style="background-color: hsl(250 92% 91%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 2</span><span>1:15.00/L87/C16</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(3 70% 81%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 3</span><span>1:11.64/L78/C26</span></div></td>
    <td style="background-color: hsl(115 41% 69%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 3</span><span>1:11.64/L78/C26</span></div></td>
    <td style="background-color: hsl(248 90% 86%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 3</span><span>1:11.64/L78/C26</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(1 70% 73%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 4</span><span>1:8.59/L68/C38</span></div></td>
    <td style="background-color: hsl(120 41% 54%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 4</span><span>1:8.59/L68/C38</span></div></td>
    <td style="background-color: hsl(245 94% 80%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 4</span><span>1:8.59/L68/C38</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(358 65% 61%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 5</span><span>1:5.78/L56/C50</span></div></td>
    <td style="background-color: hsl(128 69% 36%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 5</span><span>1:5.78/L56/C50</span></div></td>
    <td style="background-color: hsl(240 89% 72%); color: rgb(0 0 0)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 5</span><span>1:5.78/L56/C50</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(356 51% 49%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 6</span><span>5.37:1/L45/C50</span></div></td>
    <td style="background-color: hsl(134 97% 25%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 6</span><span>5.37:1/L45/C50</span></div></td>
    <td style="background-color: hsl(237 61% 59%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 6</span><span>5.37:1/L45/C50</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(357 49% 39%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 7</span><span>7.50:1/L36/C38</span></div></td>
    <td style="background-color: hsl(132 93% 20%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 7</span><span>7.50:1/L36/C38</span></div></td>
    <td style="background-color: hsl(238 41% 47%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 7</span><span>7.50:1/L36/C38</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(359 42% 31%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 8</span><span>10.04:1/L28/C26</span></div></td>
    <td style="background-color: hsl(128 76% 17%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 8</span><span>10.04:1/L28/C26</span></div></td>
    <td style="background-color: hsl(241 36% 36%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 8</span><span>10.04:1/L28/C26</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(1 34% 23%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 9</span><span>12.73:1/L21/C16</span></div></td>
    <td style="background-color: hsl(122 53% 15%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 9</span><span>12.73:1/L21/C16</span></div></td>
    <td style="background-color: hsl(244 31% 26%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 9</span><span>12.73:1/L21/C16</span></div></td>
  </tr>
  <tr>
    <td style="background-color: hsl(2 25% 17%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Red 10</span><span>15.20:1/L15/C8</span></div></td>
    <td style="background-color: hsl(116 31% 13%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Green 10</span><span>15.20:1/L15/C8</span></div></td>
    <td style="background-color: hsl(247 22% 18%); color: rgb(255 255 255)"><div style="display: flex; justify-content: space-between; column-gap: 1ch"><span>Blue 10</span><span>15.20:1/L15/C8</span></div></td>
  </tr>
</table>
```

``` vega-lite カラーパターン(V3)のHSV色空間における彩度と明度
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      { "name": "Red(0°)", "luminance": 0.95, "hue": 24.749786805855027, "saturation": 0.070316491232405, "value": 0.9951834208522242 },
      { "name": "Red(0°)", "luminance": 0.87, "hue": 24.749786805855027, "saturation": 0.16321571136001933, "value": 0.9702297624109132 },
      { "name": "Red(0°)", "luminance": 0.78, "hue": 24.749786805855027, "saturation": 0.27457561401693464, "value": 0.9433027022093451 },
      { "name": "Red(0°)", "luminance": 0.68, "hue": 24.749786805855027, "saturation": 0.4117107782368018, "value": 0.9185195418591092 },
      { "name": "Red(0°)", "luminance": 0.56, "hue": 24.749786805855027, "saturation": 0.5787564346480588, "value": 0.8638031548585343 },
      { "name": "Red(0°)", "luminance": 0.45, "hue": 24.749786805855027, "saturation": 0.6771035316748464, "value": 0.7397211330488714 },
      { "name": "Red(0°)", "luminance": 0.36, "hue": 24.749786805855027, "saturation": 0.6561400800373225, "value": 0.5823819482403176 },
      { "name": "Red(0°)", "luminance": 0.28, "hue": 24.749786805855027, "saturation": 0.5965200519209674, "value": 0.43589933797220437 },
      { "name": "Red(0°)", "luminance": 0.21, "hue": 24.749786805855027, "saturation": 0.5198690949991017, "value": 0.31255125106798093 },
      { "name": "Red(0°)", "luminance": 0.15, "hue": 24.749786805855027, "saturation": 0.3957797208495075, "value": 0.206333170923316 },
      { "name": "Green(120°)", "luminance": 0.95, "hue": 140.5636732495075, "saturation": 0.08184004052780477, "value": 0.9630740920667128 },
      { "name": "Green(120°)", "luminance": 0.87, "hue": 140.5636732495075, "saturation": 0.17762758439922968, "value": 0.8925950645361435 },
      { "name": "Green(120°)", "luminance": 0.78, "hue": 140.5636732495075, "saturation": 0.32027179044445736, "value": 0.816148484375198 },
      { "name": "Green(120°)", "luminance": 0.68, "hue": 140.5636732495075, "saturation": 0.5201280384381954, "value": 0.7291317491013615 },
      { "name": "Green(120°)", "luminance": 0.56, "hue": 140.5636732495075, "saturation": 0.8202160448602241, "value": 0.6079249505049134 },
      { "name": "Green(120°)", "luminance": 0.45, "hue": 140.5636732495075, "saturation": 0.9905020276797826, "value": 0.48651185895254817 },
      { "name": "Green(120°)", "luminance": 0.36, "hue": 140.5636732495075, "saturation": 0.9639234086526659, "value": 0.3881025940763136 },
      { "name": "Green(120°)", "luminance": 0.28, "hue": 140.5636732495075, "saturation": 0.8585090407885149, "value": 0.30269507439720317 },
      { "name": "Green(120°)", "luminance": 0.21, "hue": 140.5636732495075, "saturation": 0.7095562090645828, "value": 0.22943800669355385 },
      { "name": "Green(120°)", "luminance": 0.15, "hue": 140.5636732495075, "saturation": 0.4901131534855773, "value": 0.1658661602915935 },
      { "name": "Blue(240°)", "luminance": 0.95, "hue": 297.0813611583072, "saturation": 0.06315368029742592, "value": 0.9996512317006229 },
      { "name": "Blue(240°)", "luminance": 0.87, "hue": 297.0813611583072, "saturation": 0.15862380478384933, "value": 0.9946853028330463 },
      { "name": "Blue(240°)", "luminance": 0.78, "hue": 297.0813611583072, "saturation": 0.26280266907129407, "value": 0.9866849170595752 },
      { "name": "Blue(240°)", "luminance": 0.68, "hue": 297.0813611583072, "saturation": 0.38641059256922133, "value": 0.9897640139078788 },
      { "name": "Blue(240°)", "luminance": 0.56, "hue": 297.0813611583072, "saturation": 0.5198535624477825, "value": 0.9580107463081579 },
      { "name": "Blue(240°)", "luminance": 0.45, "hue": 297.0813611583072, "saturation": 0.6008263723863019, "value": 0.8289472217269603 },
      { "name": "Blue(240°)", "luminance": 0.36, "hue": 297.0813611583072, "saturation": 0.5801094446919844, "value": 0.6494952974410075 },
      { "name": "Blue(240°)", "luminance": 0.28, "hue": 297.0813611583072, "saturation": 0.5323261314114928, "value": 0.48464884928909496 },
      { "name": "Blue(240°)", "luminance": 0.21, "hue": 297.0813611583072, "saturation": 0.4674105163510379, "value": 0.3386198227255144 },
      { "name": "Blue(240°)", "luminance": 0.15, "hue": 297.0813611583072, "saturation": 0.36412440013884845, "value": 0.21842215816296756 }
    ]
  },
  "mark": {
    "type": "point"
  },
  "encoding": {
    "x": {
      "field": "saturation",
      "title": "Saturation",
      "type": "quantitative",
      "scale": {
        "domainMin": 0,
        "domainMax": 1
      }
    },
    "y": {
      "field": "value",
      "title": "Value",
      "type": "quantitative",
      "scale": {
        "domainMin": 0,
        "domainMax": 1
      }
    },
    "color": {
      "field": "name",
      "title": null,
      "type": "nominal",
      "scale": {
        "range": ["red", "green", "blue"]
      },
      "sort": {
        "field": "hue"
      }
    }
  }
}
```

## おわりに

ここまで、カラーパレットを生成するアルゴリズムを3つ解説したが、今回作成したツールでは最後に紹介したLch色空間を使う方法を採用している。

なお本ツールでは、本稿で説明した色相、輝度、Colorfulness以外にも、テーマごとにColorfulnessのオフセットとスケールを設定できる。つまり、テーマによって視覚上の鮮かさの調整が可能だ。さらに、色空間のパラメータとして、3原色(Primaries)の色度(Chromaticity)、光源(Illuminant)の白色点(WhitePoint)を選ぶことができる。これらを変えることで生成される色は大きく変化する。

> [Harmonious Color Palette Generator](/works/harmonious-color-palette-generator/)

最後に、今回紹介した3つのアルゴリズムはどれもシンプルで実装が容易だった。これらが、読者が新たなツールを作る時の参考にもなれば幸いである。
