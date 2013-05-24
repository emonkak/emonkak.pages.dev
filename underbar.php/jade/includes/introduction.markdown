## Introduction

Underbar.phpは配列と遅延リストに関する便利な関数を提供する[Underscore.js](http://underscorejs.org/)に似たPHPのライブラリです。
Underscore.jsのPHPへの移植ではないのでAPIにいくつかの違いはありますが、基本的にはUnderscore.jsと互換性のある動作をします。

Underscore.jsとの最も大きな違いは遅延リスト(遅延ストリーム)が扱える点です。
遅延リストとは要素の計算が遅延されるコンテナで、具体的なPHPの実装で言うと[Traversable](http://php.net/manual/ja/class.traversable.php)インターフェイスを実装したオブジェクトを指します。
遅延リストの要素は必要になった時点で生成されるため、配列を生成するよりメモリ使用量を大きく抑えられる場合があります。

`map()`などの配列を返す関数のほとんどは、`Traversable`なオブジェクト(遅延リスト)を返すことできるAPIが用意されています。
また、配列を引数に取るあらゆる関数は`Traversable`なオブジェクトを取ることもできます。

	use Underbar\Strict as S;  // 正格リスト(配列)版
	use Underbar\Lazy as L;  // 遅延リスト版
	
	$xs = [1, 2, 3, 4];
	$twice = function($n) { $n * 2 };
	
	$ys = S::map($xs, $twice);
	$zs = L::map($xs, $twice);
	
	var_dump(is_array($ys));  // true
	var_dump($ys instanceof Traversable);  // false
	var_dump(is_array($zs));  // false
	var_dump($zs instanceof Traversable);  // true
	
	var_dump($ys);  // [2, 4, 6, 8]
	var_dump(iterator_to_array($ys));  // [2, 4, 6, 8]
