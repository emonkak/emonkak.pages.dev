`$value`をメソッドチェインで処理するための`Wrapper`で包んで返します。

##### `Wrapper`で利用可能なメソッド

| Method            | Destination
|:------------------|:------------
| Wrapper *eager*() | `Eager`に切り替える
| Wrapper *lazy*()  | `Lazy`に切り替える
| Wrapper *value*() | ラッパーから値を取り出す

```php
$stooges = [
    ['name' => 'curly', 'age' => 25],
    ['name' => 'moe', 'age' => 21],
    ['name' => 'larry', 'age' => 23]
];
$youngest = _::chain($stooges)
  ->sortBy(function($stooge){ return $stooge['age']; })
  ->map(function($stooge){ return $stooge['name'] . ' is ' . $stooge['age']; })
  ->first()
  ->value();
=> "moe is 21"
```
