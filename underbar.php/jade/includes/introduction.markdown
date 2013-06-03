*Underbar.php*は[Underscore.js](http://underscorejs.org/)ライクな便利な関数を提供するPHPのライブラリです。
Underscore.jsの移植としては既に[Undersocore.php](http://brianhaveri.github.io/Underscore.php/)がありますが、*Underbar.php*は純粋な移植ではないのでいくつかの違いがあります。

- 遅延リスト(遅延ストリーム)のサポート
- [Collections](#collections)、[Arrays](#arrays)、[Objects](#objects)の関数をmixinする[`Enumerable`](#Enumerable)トレイト
- いくつかの関数を追加
  - *Collections*: [`parMap()`](#parMap), [`get()`](#get), [`span()`](#span), [`memoize()`](#memoize)
  - *Arrays*: [`takeWhile()`](#takeWhile), [`dropWhile()`](#dropWhile), [`cycle()`](#cycle), [`repeat()`](#repeat), [`iterate()`](#iterate)
  - *Objects*: [`isTraversable()`](#isTraversable)
- PHPでは不要あるいは使用頻度の低い関数は削除
  - *Functions*: `bind()`, `bindAll()`, `partial()`, `memoize()`, `delay()`, `defer()`, `throttle()`, `debounce()`, `once()`, `after()`, `wrap()`, `compose()`
  - *Objects*: `isEqual()`, `isEmpty()`, `isElement()`, `isObject()`, `isArguments()`, `isFunction()`, `isNumber()`, `isFinite()`, `isBoolean()`, `isDate()`, `isRegExp()`, `isNaN()`, `isNull()`, `isUndefined()`
  - *Utility*: `noConflict()`, `times()`, `random()`, `mixin()`, `uniqueid()`, `escape()`, `unescape()`, `result()`, `template()`

### Example

以下は配列の要素を2倍にして新しい配列を返す例です。

```php
use Underbar\Strict as _;  // Array version class

$xs = _::map([1, 2, 3, 4], function($n) { return $n * 2; });
var_dump(is_array($xs));  // true
var_dump($xs);  // [2, 4, 6, 8]
```

これを遅延リストを返すように書き換えてみます。

```php
use Underbar\Lazy as _;  // Lazy list version class

$xs = _::map([1, 2, 3, 4], function($n) { return $n * 2; });
var_dump($xs instanceof Traversable);  // true
var_dump(iterator_to_array($xs));  // [2, 4, 6, 8]
```

このように配列版([`Strict`](#Strict))と遅延リスト版([`Lazy`](#Lazy))のクラスは互換性のあるインターフェイスを持っているので容易に切り替えることができます。

Underscore.jsのように[`chain()`](#chain)を使ってメソッドチェインで処理を書くこともできます。

```php
use Underbar\Lazy as _;

// Fibonacci sequence
echo _::chain([1, 1])
    ->iterate(function($pair) { return [$pair[1], _::sum($pair)]; })
    ->map(_::ref('first'))
    ->take(10)
    ->join()
    ->value();  // 1,1,2,3,5,8,13,21,34,55
```
