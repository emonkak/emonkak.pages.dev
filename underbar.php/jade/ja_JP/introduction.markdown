Introduction
------------

Underbar.phpは[Underscore.js](http://underscorejs.org/)のような便利なユーティリティを提供するPHPのライブラリです。
Underscore.jsのPHPへの移植としては既に[Undersocore.php](http://brianhaveri.github.io/Underscore.php/)がありますが、Underbar.phpは[Iterator](http://php.net/manual/ja/class.iterator.php)を利用した遅延リストを扱えるのが特徴です。

Underscore.jsとの互換性を最優先に設計されているわけではないため、
Underscore.jsにはある関数がなかったり、逆に新しく追加された関数があったりもします。
同名の関数は基本的にUnderscore.jsと互換性のある動作をするので、Underscore.jsとほとんど同じ感覚で使うことができます。

### Features

- [Iterator](http://php.net/manual/ja/class.iterator.php)による遅延リストのサポート
- Rubyの[Enumerable](http://doc.ruby-lang.org/ja/1.9.3/class/Enumerable.html)のような[`Enumerable`](#Enumerable)トレイト
- underscore.jsにはない新たに追加された関数
  - *Collections*: [`scanl()`](#scanl), [`scanr()`](#scanr), [`span()`](#span), [`toList`](#toList), [`memoize()`](#memoize)
  - *Arrays*: [`takeWhile()`](#takeWhile), [`dropWhile()`](#dropWhile), [`cycle()`](#cycle), [`repeat()`](#repeat), [`iterate()`](#iterate)
  - *Objects*: [`isTraversable()`](#isTraversable)
  - *Parallel*: [`parMap()`](#parMap)

### Example

以下は配列の要素を2倍にして新しい配列を返す例です。

```php
use Underbar\Eager as _;  // Array version class

$xs = _::map([1, 2, 3, 4], function($n) { return $n * 2; });
var_dump(is_array($xs));  // true
var_dump($xs);  // [2, 4, 6, 8]
```

これをIteratorを返すように書き換えてみます。

```php
use Underbar\Lazy as _;  // Iterator version class

$xs = _::map([1, 2, 3, 4], function($n) { return $n * 2; });
var_dump($xs instanceof Traversable);  // true
var_dump(iterator_to_array($xs));  // [2, 4, 6, 8]
```

このように[`Eager`](#Eager)と[`Lazy`](#Lazy)は互換性があるので容易に切り替えることができます。

Underscore.jsのように[`chain()`](#chain)を使ってメソッドチェインで処理を書くこともできます。

```php
use Underbar\Lazy as _;

// Fibonacci sequence
echo _::chain([1, 1])
    ->iterate(function($pair) { return [$pair[1], _::sum($pair)]; })
    ->map(function($pair) { return $pair[0]; })
    ->take(10)
    ->join()
    ->value();  // 1,1,2,3,5,8,13,21,34,55
```
