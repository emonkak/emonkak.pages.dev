## Classes and Trait

- `Underbar\Strict`

  正格リストを提供

- `Underbar\Lazy`

  [`class_alias()`](http://php.net/manual/ja/function.class-alias.php)によって作成されたエイリアスクラスです。
  [`Generator`](http://php.net/manual/ja/class.generator.php)が利用可能であれば`Underbar\LazyGenerator`を、利用できなければ`Underbar\LazyIterator`を参照します。

- `Underbar\LazyIterator` extends `Underbar\Strict`

- `Underbar\LazyGenerator` extends `Underbar\Strict`

- `Underbar\Enumerable`

- `Underbar\Internal\*`

  内部の実装で使われているクラスです。
