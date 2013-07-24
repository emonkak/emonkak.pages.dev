引数で指定した配列すべてに存在する値でのみ構成される配列を新しく返します。
内部で組み込みの[`array_intersect()`](http://php.net/manual/ja/function.array-intersect.php)を呼び出しています。

```php
_::intersection([1, 2, 3], [101, 2, 1, 10], [2, 1]);
=> [1, 2]
```
