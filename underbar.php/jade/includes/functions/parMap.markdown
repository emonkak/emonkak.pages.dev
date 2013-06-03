[`map()`](#map)の並列実行版です。
`$xs`の各要素に対して関数`$f`を並列に適用する[`Iterator`](http://php.net/manual/ja/class.iterator.php)を返します。
`$f`は引数`(element)`を1つだけ取る関数です。
`$n`は同時に起動するワーカープロセスの数です。

`$n`が2以上の時は複数のワーカープロセスによって処理されるため、返ってくる要素の順序は不定です。

```php
$xs =_::parMap([1, 2, 3], function($x) {
    sleep(2);
    return $x * 3;
});
// デフォルトは4並列で実行されるので約2秒ですべての計算が終わります。
foreach ($xs as $x) {
    var_dump($x);  // 3, 6, 9が順不同に出力されます
}
```
