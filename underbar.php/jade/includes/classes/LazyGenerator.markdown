[`Generator`][generator]による遅延リスト版のAPIを提供するクラスです。
[`Generator`][generator]はforeachなどによる反復処理を繰り返して実行することはできませんが、このクラスでは[`Generator`][generator]を返すメソッドについてラッパー([`Internal\RewindableGenerator`](#RewindableGenerator))を噛ますことで反復処理の繰り返しを可能にしています。
ラッパーが不要な場合は[`UnsafeLazyGenerator`](#UnsafeLazyGenerator)を利用できます。

[generator]: http://php.net/manual/ja/class.generator.php
[iterator]: http://php.net/manual/ja/class.iterator.php
