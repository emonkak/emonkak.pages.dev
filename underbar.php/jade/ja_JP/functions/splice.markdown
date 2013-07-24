`$xs`の要素を`$index`から`$n`個取り除いて新しい要素`$values`を追加します。
`$values`を指定しなかった場合は単に要素を取り除きます。
内部でPHP組み込みの[`array_splice`](http://php.net/manual/ja/function.array-splice.php)を利用しています。

```php
$myFish = ['angel', 'clown', 'mandarin', 'surgeon'];

_::splice($myFish, 2, 0, 'drum');
=> ["angel", "clown", "drum", "mandarin", "surgeon"]

_::splice($myFish, 1, 2);
=> ["angel", "surgeon"];
```
