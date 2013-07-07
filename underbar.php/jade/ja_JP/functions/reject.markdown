`$xs`の要素について`$f`が`true`を返すものを除外します。
逆の操作を行う関数として[`filter()`](#filter)があります。

```php
$evens = _::filter([1, 2, 3, 4, 5, 6], function($n) {
    return $n % 2 === 0;
});
// => [1, 3, 5]
```
