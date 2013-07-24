`$xs`から`$begin`から`$end`までのインデックスの要素を切り出します。
`take(drop($xs, $begin), $end - $begin)`と等価な操作です。
内部で組み込みの[`array_slice()`](http://php.net/manual/ja/function.array-slice.php)が呼び出されます。

`$begin`と`$end`に負の値が指定された場合は末尾から数えたインデックスを示します。
`$end`が省略された場合は配列の末尾までを対象とします。

```php
_::slice([1, 2, 3, 4, 5], 2);
=> [3, 4, 5]

_::slice($xs, -2);
=> [4, 5]
```
