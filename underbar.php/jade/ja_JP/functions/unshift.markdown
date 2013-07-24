`$xs`の先頭に`$values`を追加します。
[`Iterator`](http://php.net/manual/ja/class.iterator.php)に対して呼び出された場合は配列に変換されます。

```php
_::unshift([1, 2, 3], 4)
=> [4, 1, 2, 3]

_::unshift([1, 2, 3], 4, 5)
=> [4, 5, 1, 2, 3]
```
