Introduction
------------

Underbar.phpは[Underscore.js](http://underscorejs.org/)のようなリスト処理のためのPHPのライブラリです。
Underscore.jsのPHPへの移植としては既に[Undersocore.php](http://brianhaveri.github.io/Underscore.php/)がありますが、Underbar.phpはUnderscore.jsとの互換を最優先にはしてはいません。

しかし、同名の関数は基本的にUnderscore.jsと同じ動作をするので、Underscore.jsとほとんど同じ感覚で使うことができます。

### Features

- [`Iterator`](http://php.net/manual/ja/class.iterator.php)による遅延リストのサポート
- [`Generator`](http://php.net/manual/ja/class.generator.php)による遅延リストのサポート
- [Lo-Dash](http://lodash.com/)のような[`chain()`](#chain)による直感的なメソッドチェイン
- Rubyの[Enumerable](http://doc.ruby-lang.org/ja/1.9.3/class/Enumerable.html)のような[`Enumerable`](#Enumerable)トレイト
- Underscore.jsにはない関数を新たに追加
  - *Collections:* [`memoize()`](#memoize) [`toList`](#toList)
  - *Arrays:* [`takeWhile()`](#takeWhile) [`dropWhile()`](#dropWhile) [`cycle()`](#cycle) [`repeat()`](#repeat) [`iterate()`](#iterate)
  - *Parallel:* [`parMap()`](#parMap)

### Example

以下は配列の要素を2倍にして新しい配列を返す例です。

```php
use Underbar\ArrayImpl as _;  // Array implement class

$xs = _::map([1, 2, 3, 4], function($n) { return $n * 2; });
var_dump(is_array($xs));  // true
var_dump($xs);  // [2, 4, 6, 8]
```

これを`Iterator`を返す実装に切り替えます。
`Iterator`は実際に要素を走査するまで計算が遅延されるので、空間効率で有利です。

```php
use Underbar\IteratorImpl as _;  // Iterator implement class

$xs = _::map([1, 2, 3, 4], function($n) { return $n * 2; });
var_dump($xs instanceof Traversable);  // true
var_dump(iterator_to_array($xs));  // [2, 4, 6, 8]
```

メソッドチェインで処理を書くには[`chain()`](#chain)を利用します。

```php
use Underbar\IteratorImpl as _;

// Fibonacci sequence
echo _::chain([1, 1])
    ->iterate(function($pair) { return [$pair[1], _::sum($pair)]; })
    ->map(function($pair) { return $pair[0]; })
    ->take(10)
    ->join();  // 1,1,2,3,5,8,13,21,34,55
```
