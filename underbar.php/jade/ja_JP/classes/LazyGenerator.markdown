[`Generator`](http://php.net/manual/ja/class.generator.php)を返すAPIを提供するクラスです。
`Generator`は走査を繰り返すと例外が発生することに注意して下さい。
これを回避したい場合は[`LazySafeGenerator`](#LazySafeGenerator)を利用できます。

```php
use Underbar\LazyGenerator as _;

$xs = _::range(10);
foreach ($xs as $x);
// 'Exception' with message 'Cannot traverse an already closed generator'
foreach ($xs as $x);
```

`Generator`を巻き戻したい場合は[`LazySafeGenerator`](#LazySafeGenerator)が利用できます。
