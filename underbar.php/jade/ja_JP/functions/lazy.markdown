[`Traversable`]なオブジェクトを返す関数から[`IteratorAggregate`]を生成します。

[`Traversable`]: http://php.net/manual/ja/class.traversable.php
[`IteratorAggregate`]: http://php.net/manual/ja/class.iteratoraggregate.php
[`Generator`]: http://php.net/manual/ja/class.generator.php
[`rewind()`]: http://www.php.net/manual/ja/iterator.rewind.php

```php
$xs = _::lazy(function() {
	return new ArrayIterator([1, 2, 3]);
});
foreach ($xs as $x) {
	echo $x;  // 1, 2, 3
}
```
