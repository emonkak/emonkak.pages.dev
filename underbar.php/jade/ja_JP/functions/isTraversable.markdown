`$value`が配列か[`Traversable`](http://php.net/manual/ja/class.traversable.php)インターフェイスが実装されたオブジェクトかどうかを返します。

```php
_::isTraversable([1, 2, 3]);
=> true

_::isTraversable(new EmptyIterator());
=> true

_::isTraversable(new stdClass());
=> false
```
