Underbar.phpは[Underscore.js](http://underscorejs.org/)ライクな便利な関数群を提供するPHPのライブラリです。
Underscore.jsの純粋な移植ではないのでいくつかの違いがあります。

- 遅延リスト(遅延ストリーム)のサポート
- [`Traversable`](http://php.net/manual/ja/class.traversable.php)なクラスに[Arrays](#arrays)と[Objects](#objects)の関数をmixinする[`Enumerable`](#class-Enumerable)トレイト
- いくつかの関数を追加
  - **Collections**: [`parMap`](#function-parMap), [`get`](#function-get), [`span`](#function-span), [`memoize`](#function-memoize)
  - **Arrays**: [`takeWhile`](#function-takeWhile), [`dropWhile`](#function-dropWhile), [`cycle`](#function-cycle), [`repeat`](#function-repeat), [`iterate`](#function-iterate)
  - **Objects**: [`isTraversable`](#function-isTraversable)
- 使用頻度が高くないもの、PHP組み込みの関数と重複しているもの、PHPでは実現が困難なものは未実装
  - **Functions**: `bind`, `bindAll`, `partial`, `memoize`, `delay`, `defer`, `throttle`, `debounce`, `once`, `after`, `wrap`, `compose`
  - **Objects**: `isEqual`, `isEmpty`, `isElement`, `isObject`, `isArguments`, `isFunction`, `isNumber`, `isFinite`, `isBoolean`, `isDate`, `isRegExp`, `isNaN`, `isNull`, `isUndefined`
  - **Utility**: `noConflict`, `times`, `random`, `mixin`, `uniqueid`, `escape`, `unescape`, `result`, `template`

以下に配列の要素を2倍にする手続きを配列と遅延リストそれぞれ返す場合について例示します。

	use Underbar\Strict as S;  // 配列版クラス
	use Underbar\Lazy as L;    // 遅延リスト版クラス
	
	$xs = [1, 2, 3, 4];
	$twice = function($n) { return $n * 2; };
	
	$ys = S::map($xs, $twice);
	var_dump(is_array($ys));  // true
	var_dump($ys instanceof Traversable);  // false
	var_dump($ys);  // [2, 4, 6, 8]

	$zs = L::map($xs, $twice);
	var_dump(is_array($zs));  // false
	var_dump($zs instanceof Traversable);  // true
	var_dump(iterator_to_array($ys));  // [2, 4, 6, 8]

このように配列版([`Strict`](#class-Strict))と遅延リスト版([`Lazy`](#class-Lazy))のクラスは互換性のあるインターフェイスを持っているので容易に切り替えができます。

Underscore.jsのように[`chain`](#function-chain)を使ってメソッドチェインで配列を処理することもできます。

	use Underbar\Lazy as _;

	// Fibonacci sequence
	echo _::chain([1, 1])
	    ->iterate(function($pair) { return [$pair[1], _::sum($pair)]; })
	    ->map(function($pair) { return _::first($pair); })
	    ->take(10)
	    ->toArray()
	    ->join()
	    ->value();  // => 1,1,2,3,5,8,13,21,34,55
