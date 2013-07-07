[`Generator`](http://php.net/manual/ja/class.generator.php)を返すAPIを提供するクラスです。
`Generator`は走査を繰り返すと例外が発生しますが、このクラスのAPIは`Generator`を`RewindableGenerator`でラップして反復可能にしています。
