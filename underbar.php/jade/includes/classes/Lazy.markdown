複数個の要素を返す時に、遅延リストとして値を返すAPIを提供するクラスへのエイリアスです。
[`Generator`](http://php.net/manual/ja/class.generator.php)が利用可能であれば[`LazyGenerator`](#class-LazyGenerator)を、利用できなければ[`LazyIterator`](#class-LazyIterator)を参照します。
実装されているメソッドの種類は[`Strict`](#class-Strict)と同一で、遅延リストを返すように書き換え可能なメソッドについてはオーバーライドされています。
