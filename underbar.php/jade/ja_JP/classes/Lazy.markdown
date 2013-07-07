Iteratorを返すAPIを提供するクラスへのエイリアスです。
[`Generator`](http://php.net/manual/ja/class.generator.php)が利用可能であれば[`LazyGenerator`](#LazyGenerator)を、利用できなければ[`LazyIterator`](#LazyIterator)を参照します。

オートローダーでロードされる前に同名のエイリアスを定義することで、
定義を上書きすることもできます。

```php
class_alias('Underbar\\LazySafeGenerator', 'Underbar\\Lazy');
```
