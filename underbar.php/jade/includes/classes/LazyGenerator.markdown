複数個の要素を返す時に、[`Generator`](http://php.net/manual/ja/class.generator.php)を利用して遅延リストを返すAPIを提供するクラスです。
[`LazyIterator`](#class-LazyIterator)よりも高速するので、クラスエイリアスの[`Lazy`](#class-Lazy)はこちらを優先します。

`Generator`はforeachなどで2回走査しようとすると例外が発生しますが、
このクラスの`Generator`を返すメソッドには`Generator`を都度生成させるためのラッパー(`Internal\RewindableGenerator`)を噛ますので例外セーフです。
