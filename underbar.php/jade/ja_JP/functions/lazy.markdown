[`Traversable`]なオブジェクトを返す関数`$f`の実行結果をソースとする[`IteratorAggregate`]を返します。
これを利用して[`Generator`]の複数回の走査を可能にすることもできます。

[`Traversable`]: http://php.net/manual/ja/class.traversable.php
[`IteratorAggregate`]: http://php.net/manual/ja/class.iteratoraggregate.php
[`Generator`]: http://php.net/manual/ja/class.generator.php
[`rewind()`]: http://www.php.net/manual/ja/iterator.rewind.php

```php
$xs = _::lazy(function() {
	yield 1;
	yield 2;
	yield 3;
});
foreach ($xs as $x) {
	echo $x;  // 1, 2, 3
}
foreach ($xs as $x) {
	echo $x;  // 1, 2, 3
}
```
