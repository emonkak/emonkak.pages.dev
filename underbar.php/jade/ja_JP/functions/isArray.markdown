`$value`が配列か[`ArrayAccess`](http://php.net/manual/ja/class.arrayaccess.php)インターフェイスを実装しているオブジェクトかどうかを返します。

```php
_::isArray([1, 2, 3]);
=> true

_::isArray(new ArrayObject());
=> true

_::isArray(new EmptyIterator());
=> false
```
