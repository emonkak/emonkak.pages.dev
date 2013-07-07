Haskellの[`span`](http://hackage.haskell.org/packages/archive/base/latest/doc/html/Prelude.html#v:span)からの移植です。
`$xs`の要素に対して`$f`が最後に`false`を返す要素までと、それ以降の要素に分割します。
`span($xs, $f)`は`[takeWhile($xs, $f), dropWhile($xs, $f)]`と等価な操作です。

```php
list ($xs, $ys) = _::span([1, 2, 3, 4, 1, 2, 3, 4], function($x) {
  return $x < 3;
}, 0);
// => [[1, 2], [3, 4, 1, 2, 3, 4]]
```
