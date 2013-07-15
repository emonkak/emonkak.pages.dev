`$xs`の要素について`$f`が`true`を返すものを選択します。
逆の操作を行う関数として[`reject()`](#reject)があります。

```php
$evens = _::filter([1, 2, 3, 4, 5, 6], function($n) {
    return $n % 2 === 0;
});
=> [2, 4, 6]
```
