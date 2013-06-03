*array*の各要素に対して関数`$f`を呼び出します。
`$f`は`(element, key, array)`の3つの引数を取ります。

```php
_::each([1, 2, 3], function($x, $k, $xs) {
     echo $x, PHP_EOL;
});
// 1, 2, 3を順番に出力
$xs = ['one' => 1, 'two' => 2, 'three' => 3];
_::each($xs, function($x, $k, $xs) {
    echo $k, '-', $x, PHP_EOL;
});
// one-1, two-2, three-3を順番に出力
```
