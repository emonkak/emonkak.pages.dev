`$xs`の要素から`$properties`のキーと値のペアに最初に一致するものを返します。
見付からない場合は`null`を返します。

```php
$members = [
    ['name' => 'Yukari Tamura', 'sex' => 'female', 'age' => 17],
    ['name' => 'Chinatsu Akasaki', 'sex' => 'female'],
    ['name' => 'Ai Kayano', 'sex' => 'female', 'age' => 25]
];
_::findWhere($members, ['sex' => 'female', 'age' => 17]);
// => ["name" => "Yukari Tamura", "sex" => "female", "age" => 17]
```
