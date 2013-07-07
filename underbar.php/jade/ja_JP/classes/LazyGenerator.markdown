[`Generator`](http://php.net/manual/ja/class.generator.php)を返すAPIを提供するクラスです。
`Generator`は巻き戻せない`Iterator`なので、2回目の走査で例外が発生することに注意して下さい。

```php
use Underbar\LazyGenerator as _;

$xs = _::range(10);
foreach ($xs as $x);
// 'Exception' with message 'Cannot traverse an already closed generator'
foreach ($xs as $x);
```

`Generator`を巻き戻したい場合は[`LazySafeGenerator`](#LazySafeGenerator)が利用できます。
