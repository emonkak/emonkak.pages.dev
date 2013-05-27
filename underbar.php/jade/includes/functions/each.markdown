*array*の各要素に対して関数`$f`を呼び出します。
`$f`は`(element, index, array)`の3つの引数を取ります。

	>>> _::each([1, 2, 3], function($x, $i, $xs) {
	...   echo $x, PHP_EOL;
	... })
	1
	2
	3
	>>> $xs = ['one' => 1, 'two' => 2, 'three' => 3]
	... _::each($xs, function($x, $k, $xs) {
	...   echo $k, '-', $x, PHP_EOL;
	... });
	one-1
	two-2
	three-3
