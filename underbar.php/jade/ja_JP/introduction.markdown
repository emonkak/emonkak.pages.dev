Introduction
------------

Underbar.phpは[Underscore.js](http://underscorejs.org/)のような便利なユーティリティを提供するPHPのライブラリです。
Underscore.jsのPHPへの移植としては既に[Undersocore.php](http://brianhaveri.github.io/Underscore.php/)がありますが、Underbar.phpは配列とIteratorに関する操作に特化しています。

### Features

- [Iterator](http://php.net/manual/ja/class.iterator.php)による遅延リスト(遅延ストリーム)のサポート
- [Traversable](http://php.net/manual/ja/class.traversable.php)なクラスにメソッドを追加する[`Enumerable`](#Enumerable)トレイト
- underscore.jsにはない関数をいくつか追加
  - *Collections*: [`parMap()`](#parMap), [`scanl()`](#scanl), [`scanr()`](#scanr), [`span()`](#span), [`memoize()`](#memoize)
  - *Arrays*: [`takeWhile()`](#takeWhile), [`dropWhile()`](#dropWhile), [`cycle()`](#cycle), [`repeat()`](#repeat), [`iterate()`](#iterate)
  - *Objects*: [`isTraversable()`](#isTraversable)

### Example

以下は配列の要素を2倍にして新しい配列を返す例です。

```php
use Underbar\Strict as _;  // Array version class

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

このように配列版([`Strict`](#Strict))とIterator版([`Lazy`](#Lazy))のクラスは互換性のあるインターフェイスを持っているので容易に切り替えることができます。

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
