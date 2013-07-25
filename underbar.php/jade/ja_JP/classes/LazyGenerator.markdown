[`Generator`](http://php.net/manual/ja/class.generator.php)を返すAPIを提供するクラスです。
`Generator`は走査を繰り返すと例外が発生することに注意して下さい。
[`LazySafeGenerator`](#LazySafeGenerator)を利用することで例外を回避することもできます。

```php
use Underbar\LazyGenerator as _;

$xs = _::range(10);
foreach ($xs as $x);
// 'Exception' with message 'Cannot traverse an already closed generator'
foreach ($xs as $x);
```
