Haskellの[`scanl`](http://hackage.haskell.org/packages/archive/base/latest/doc/html/Prelude.html#v:scanl)からの移植です。
`$xs`の要素を`$f`によって左結合で畳み込む過程を配列として返します。
`$f`は`($acc, $value, $key, $xs)`の4つの引数を取ります。

```php
_::scanl(_::range(0, 10), function($acc, $n) {
  return $acc + $n;
}, 0);
// => [0, 1, 3, 6, 10, 15, 21, 28, 36, 45]
```
