`$xs`の要素から`$properties`のキーと値のペアに一致するものを選択します。

```php
$members = [
    ['name' => 'Yui Ogura', 'sex' => 'female', 'age' => 17],
    ['name' => 'Rina Hidaka', 'sex' => 'female', 'age' => 19],
    ['name' => 'Yuka Iguchi', 'sex' => 'female', 'age' => 24],
    ['name' => 'Yoko Hikasa', 'sex' => 'female', 'age' => 27],
    ['name' => 'Kana Hanazawa', 'sex' => 'female', 'age' => 24]
];
_::where($members, ['sex' => 'female', 'age' => 24]);
// => [["name" => "Yuka Iguchi", "sex" => "female", "age" => 24],
//     ["name" => "Kana Hanazawa", "sex" => "female", "age" => 24]]
```
