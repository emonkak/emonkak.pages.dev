---
title: メモリ効率の良いテンプレートエンジンの実装をPHPで
date: 2022-12-06
template: article.js
language: ja
tags:
  - programing
  - php
---

## 序論

PHPのWebアリプケーションではHTMLを描画するためにテンプレートエンジンが良く使われる。テンプレートエンジンは与えられたテンプレート文字列と変数を元に結果を描画する。この時、描画結果が文字列であるなら、少なくとも文字列の長さだけメモリ空間を必要とする。

一方、Webアプリケーションでは最終的にテンプレートの描画結果をレスポンスボディとして出力すればいいのであって、レスポンスボディを文字列として構築する必要はない。したがって、レスポンスボディを適当な単位に分割して出力することでメモリ使用量を節約できる。

本稿では、この点に着目してメモリ効率の良い描画を提供するテンプレートエンジンの実装を考えた。しかしながら、通常メモリ効率は実行効率とトレードオフであり、実行効率を重視した他の方式も含めた5つの実装を作成して性能を評価した。

> [emonkak/php-sharp](https://github.com/emonkak/php-sharp "今回作成したライブラリ")

## 実装コンセプト

JavaScriptには[Tagged Templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates)という機能がある。これはTemplate Literalとして記述されたテンプレート文字列を任意のタグ関数で処理する機能だ。

タグ関数は第1引数に定数文字列の配列、以降の引数にはプレースホルダーに埋め込まれた式が可変長引数で与えられる。したがって、テンプレートは定数文字列とその前後の式に分割される。

```js JavaScriptのタグ関数の例
function f(strings, ...exprs) {
    console.log({ strings, exprs });
}

const name = 'World';

// {
//   strings: ['<p>Hello <strong>', '</strong>!</p>'],
//   exprs: ['World'],
// }
f`<p>Hello <strong>${name}</strong>!</p>`;
```

この機能を参考にして、テンプレートを文字列、式、文字列、式...のようなチャンクの繰り返しとして処理することを考えた。これを実装しているのが[`AbstractCompiler`](https://github.com/emonkak/php-sharp/blob/master/src/Compiler/AbstractCompiler.php)で、後述する5つのコンパイラの実装はこのクラスを継承している。テンプレートはこのクラスの`compile()`メソッドによって描画関数を返すPHPコードとしてコンパイルされる。描画関数は変数の辞書を引数にして、返り値は実装毎に異なる描画結果(`Generator`, `array`, `string`, `resource`, `void`)を返す。

テンプレートの文法は[Blade](https://laravel.com/docs/9.x/blade)のサブセットとした。各描画関数の節では以下のようなテンプレートから生成される描画関数を簡略化した形で例示する。

```html.basic 描画関数の説明に用いるテンプレート
<p>Hello <strong>{{$name}}</strong></p>
```

## ベンチマーク結果

最初に、今回作成した5つのコンパイラの実装のベンチマーク結果を示す。[ベンチマーク](https://github.com/emonkak/php-sharp/tree/master/benchmarks/src)では`list`と`articles`の2種類のテンプレートを使用した。`list`は要素1つ1つのサイズは小さいが大量(10万)の要素を生成するテンプレートで、`articles`は要素のサイズは大きいが、少数(5000)の要素を生成するテンプレートである。

```html.basic list.blade.php
<ul>
    @for ($i = 0; $i < 100000; $i++)
    <li>{{$i}}</li>
    @endfor
</ul>
```

```html.basic articles.blade.php
<ul>
    @foreach ($articles as $article)
    <li class="article">
        <div class="article">
            <a class="article-title-anchor" href="{{$article['url']}}">{{$article['title']}}</a>
        </div>
        <div class="article-description">{{$article['description']}}</div>
        <div class="article-date">{{$article['date']}}</div>
        <ul class="article-tags">
            @foreach ($article['tags'] as $tag)
            <li class="article-tag-item">{{$tag}}</li>
            @endforeach
        </ul>
    </li>
    @endforeach
</ul>
```

処理系としてはPHP 8.2を使用した。なお、コンパイル処理自体は計測対象としておらず、事前にコンパイル・キャッシュされた描画関数の実行を計測対象とした。ただし、文字列以外の描画結果を返すコンパイラの実装の場合は、描画結果の文字列が得られる所までを計測対象としている。例えば`Generator`による実装であれば全要素を走査する。

ベンチマークの各項の詳細は以下の通りである。

- **Sharp(String)** — 文字列による描画関数を生成する実装
- **Sharp(Array)** — 配列による描画関数を生成する実装
- **Sharp(Stream)** — ストリーム(php:memory)による描画関数を生成する実装
- **Sharp(PHP)** — テンプレートエンジンとしてのPHPによる描画関数を生成する実装
- **Sharp(Generator)** — Generatorによる描画関数を生成する実装
- **Sharp(Generator&Buffer)** — バッファー付きのGeneratorによる描画関数を生成する実装
- **Blade** — Laravelデフォルトのテンプレートエンジン(参考)
- **Twig** — Symfonyデフォルトのテンプレートエンジン(参考)

```vega-lite 各実装の実行時間
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
       { "category": "Sharp(String)", "group": "articles", "value": 24.697 },
       { "category": "Sharp(String)", "group": "list", "value": 14.718 },
       { "category": "Sharp(Array)", "group": "articles", "value": 21.823 },
       { "category": "Sharp(Array)", "group": "list", "value": 21.146 },
       { "category": "Sharp(Stream)", "group": "articles", "value": 26.248 },
       { "category": "Sharp(Stream)", "group": "list", "value": 20.418 },
       { "category": "Sharp(PHP)", "group": "articles", "value": 27.089 },
       { "category": "Sharp(PHP)", "group": "list", "value": 18.080 },
       { "category": "Sharp(Generator)", "group": "articles", "value": 22.707 },
       { "category": "Sharp(Generator)", "group": "list", "value": 18.723 },
       { "category": "Sharp(Generator&Buffer)", "group": "articles", "value": 21.450 },
       { "category": "Sharp(Generator&Buffer)", "group": "list", "value": 14.296 },
       { "category": "Blade", "group": "articles", "value": 39.658 },
       { "category": "Blade", "group": "list", "value": 19.323 },
       { "category": "Twig", "group": "articles", "value": 37.868 },
       { "category": "Twig", "group": "list", "value": 19.869 }
    ]
  },
  "transform": [
      { "calculate": "round(datum.value * 10) / 10", "as": "roundedValue" }
  ],
  "layer": [
    {
      "mark": "bar"
    },
    {
      "mark": {
        "type": "text",
        "align": "center",
        "fontSize": 9,
        "fontWeight": "bold",
        "dy": -6
      },
      "encoding": {
        "text": {
          "field": "roundedValue",
          "type": "quantitative"
        }
      }
    }
  ],
  "encoding": {
    "x": {
      "field": "category",
      "title": null,
      "axis": {
        "labelAngle": -45,
        "labelLimit": 200
      },
      "scale": {
        "paddingInner": 0.30
      },
      "sort": { "op": "sum", "field": "value" }
    },
    "y": {
      "field": "value",
      "title": "Execution Time (ms)",
      "type": "quantitative"
    },
    "xOffset": {
      "field": "group",
      "scale": {
        "paddingInner": 0.20
      }
    },
    "color": { "field": "group", "title": "Template" }
  }
}
```

```vega-lite 各実装のピークメモリ使用量
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
       { "category": "Sharp(String)", "group": "articles", "value": 23.531 },
       { "category": "Sharp(String)", "group": "list", "value": 3.347 },
       { "category": "Sharp(Array)", "group": "articles", "value": 31.282 },
       { "category": "Sharp(Array)", "group": "list", "value": 25.492 },
       { "category": "Sharp(Stream)", "group": "articles", "value": 23.542 },
       { "category": "Sharp(Stream)", "group": "list", "value": 3.402 },
       { "category": "Sharp(PHP)", "group": "articles", "value": 29.082 },
       { "category": "Sharp(PHP)", "group": "list", "value": 5.682 },
       { "category": "Sharp(Generator)", "group": "articles", "value": 18.057 },
       { "category": "Sharp(Generator)", "group": "list", "value": 1.177 },
       { "category": "Sharp(Generator&Buffer)", "group": "articles", "value": 18.132 },
       { "category": "Sharp(Generator&Buffer)", "group": "list", "value": 1.245 },
       { "category": "Blade", "group": "articles", "value": 30.930 },
       { "category": "Blade", "group": "list", "value": 7.530 },
       { "category": "Twig", "group": "articles", "value": 36.333 },
       { "category": "Twig", "group": "list", "value": 9.339 }
    ]
  },
  "transform": [
      { "calculate": "round(datum.value * 10) / 10", "as": "roundedValue" }
  ],
  "layer": [
    {
      "mark": "bar"
    },
    {
      "mark": {
        "type": "text",
        "align": "center",
        "fontSize": 9,
        "fontWeight": "bold",
        "dy": -6
      },
      "encoding": {
        "text": {
          "field": "roundedValue",
          "type": "quantitative"
        }
      }
    }
  ],
  "encoding": {
    "x": {
      "field": "category",
      "title": null,
      "axis": {
        "labelAngle": -45,
        "labelLimit": 200
      },
      "scale": {
        "paddingInner": 0.30
      },
      "sort": { "op": "sum", "field": "value" }
    },
    "y": {
      "field": "value",
      "title": "Peak Memory Usage (MB)",
      "type": "quantitative"
    },
    "xOffset": {
      "field": "group",
      "scale": {
        "paddingInner": 0.20
      }
    },
    "color": { "field": "group", "title": "Template" }
  }
}
```

## 描画関数を生成するコンパイラの実装

### 文字列による実装

最初に、文字列としてチャンクを結合するという基本的な実装を考えた。文字列のような基本型は高度に最適化されているので、実行効率・メモリ効率いずれも`Generator`の実装に次いで優秀だった。以降の実装はこの実装を指標として論じる。

```php 文字列による描画関数
function render(array $data): string
{
    $contents = '';
    $contents .= '<p>Hello <strong>';
    $contents .= $data['name'];
    $contents .= '</strong>!</p>';
    return $contents;
}
```

このような描画関数を生成するものとして[`StringCompiler`](https://github.com/emonkak/php-sharp/blob/master/src/Compiler/StringCompiler.php)を作成した。

### 配列による実装

次に、配列にチャンクを追記していくという実装を考えた。この実装は、メモリ使用量が非常に大きく、基本的には文字列による実装に対する優位性はない。しかし、唯一`articles`の描画の実行効率だけは優れていた。逆説的に要素数の多い`list`の実行速度が遅いことから、この実装は要素数が増えると不利になると考えられる。

```php 配列による描画関数
function render(array $data): array
{
    $contents = [];
    $contents[] = '<p>Hello <strong>';
    $contents[] = $data['name'];
    $contents[] = '</strong>!</p>';
    return $contents;
}
```

このような描画関数を生成するものとして[`ArrayCompiler`](https://github.com/emonkak/php-sharp/blob/master/src/Compiler/ArrayCompiler.php)を作成した。

### ストリームによる実装

次に、[I/Oストリーム](https://www.php.net/manual/ja/wrappers.php.php)にチャンクを書き込む実装を考えた。今回は`php://memory`を使ってメモリ上へチャンクを書き込む実装を作成した。性能面では実行効率・メモリ効率いずれも文字列による実装より若干劣り、優位性はなかった。

```php ストリームによる描画関数
function render(array $data)
{
    $stream = fopen('php://memory', 'r+');
    fwrite($stream, '<p>Hello <strong>');
    fwrite($stream, $data['name']);
    fwrite($stream, '</strong>!</p>');
    return $stream;
}
```

このような描画関数を生成するものとして[`StreamCompiler`](https://github.com/emonkak/php-sharp/blob/master/src/Compiler/StreamCompiler.php)を作成した。

### テンプレートエンジンとしてのPHPによる実装

PHP自身はテンプレートエンジンでもあるので、それを使った実装を考えることができる。この方式はBladeやTwigと同様だ。結果は標準出力に出力されるので文字列にするためには[`ob_start()`](https://www.php.net/manual/ja/function.ob-start.php)を呼び出す必要がある。ベンチマークでもこの関数を呼び出しているからか、この実装は文字列による実装に比べて実行効率・メモリ効率いずれも大きく劣り、優位性はなかった。

もし、文字列化する必要がないのであれば、最も性能の良い実装になる可能性はある。しかし、[PSR-15](https://www.php-fig.org/psr/psr-15/)アプリケーションとの統合を考えた場合、`StreamInterface`に変換するためには全体の文字列化は不可避だ。仮に、`StreamInterface::emit()`のようなAPIがあって、直接標準出力に出力することができたならそれが性能的には理想である。

```html.php 標準出力に出力する描画関数
<?php
function render(array $data): void
{ ?>
<p>Hello <strong><?php echo $data['name']; ?>!</strong><?php } ?>
```

### ジェネレータによる描画関数

最後に、メモリ効率の良いストリーム化された描画を提供する実装を考える。描画をストリーム化するためには描画を複数回に分けて行わなければならない。このような時は処理の一時停止と再開を提供する[ジェネレータ](https://www.php.net/manual/ja/language.generators.overview.php)を使うことができる。ジェネレータを使った描画関数は以下のように定義できる。

```php ジェネレータによる描画関数
function render(array $data): \Generator
{
    yield '<p>Hello <strong>';
    yield $data['name'];
    yield '!</strong></p>';
}
```

しかし、ジェネレータの停止・再開のコストが高いため、チャンクの数が多大になると実行効率もそれに伴なって悪化していた。対策として、指定されたチャンクの最大サイズを超えるまで文字列にバッファーするように実装を改良した。この実装はメモリ使用量はもちろんのこと、実行速度も文字列の実装と同等かより速く、総合的に最も優秀だった。

```php ジェネレータによる描画関数(バッファー付き)
function render(array $data): \Generator
{
    $buffer = '';
    $buffer .= '<p>Hello <strong>';
    if (strlen($buffer) > MAX_CHUNK_SIZE) {
        yield $buffer;
        $buffer = '';
    }
    $buffer .= $data['name'];
    if (strlen($buffer) > MAX_CHUNK_SIZE) {
        yield $buffer;
        $buffer = '';
    }
    $buffer .= '!</strong></p>';
    if (strlen($buffer) > MAX_CHUNK_SIZE) {
        yield $buffer;
        $buffer = '';
    }
    if ($buffer !== '') {
        yield $buffer;
    }
}
```

このような描画関数を生成するものとして[`GeneratorCompiler`](https://github.com/emonkak/php-sharp/blob/master/src/Compiler/IteratorCompiler.php)を作成した。

PSR-15アプリケーションとの統合に関しては、`Generator`を[`StreamInterface`](https://github.com/php-fig/http-message/blob/master/src/StreamInterface.php)に変換することで、全体を文字列化しなくても済む。これを提供する既存の実装として[php-stream-iterator](https://github.com/gyselroth/php-stream-iterator)がある。しかしながら、この実装そのもののオーバーヘッドがあるので、総合的に実行効率では文字列による実装より劣る可能性がある。

## 結論

以上、5つの描画関数を生成するコンパイラの実装を作成した。中でもGeneratorを使った実装は特にメモリ効率で優れていた。当初は、文字列による実装よりも実行効率で劣るという欠点があったが、一定のサイズまで文字列としてバッファーするという方法でその点を解消することができた。それによって実行効率をトレードオフにすることなく、メモリ効率のいい描画関数を得ることができた。

今後の課題として、PSR-15アプリケーションと統合した時に実行効率が悪化する懸念がある。PSR-7の`StreamInterface`には標準出力に直接出力するためのAPIがないからだ。解決策としては、独自に以下のようなインターフェイスを定義してPSR-15アプリケーションを拡張することが考えられる。

```php
interface EmittableStreamInterface extends \Psr\Http\Message\StreamInterface
{
    /**
     * ストリームの内容を標準出力に出力する。
     */
    public function emit(): void;

    /**
     * ストリームの内容を別のストリームにパイプする。
     */
    public function pipeTo(StreamInterface $destination): void;
}
```

しかし、このインターフェイスにはテンプレートの描画中(ストリームの読み取り中)に、データベースへのクエリ等の副作用を実行するなどして例外が発生した場合、中途半端なテンプレートの内容が出力されてしまう問題がある。これは不可避であるので、テンプレートの描画中に例外が発生しないように注意する必要がある。

なお今回作成したライブラリの[Sharp](https://github.com/emonkak/php-sharp)はProof of Conceptのために実装したもので、全くプロダクションレディではないことに注意されたい。
