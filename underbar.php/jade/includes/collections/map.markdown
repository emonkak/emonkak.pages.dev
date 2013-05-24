#### *array* map(*array* `$xs`, *callable* `$f`)

Arrayの各要素に対して関数`$f`を適用して新しい配列を返します。
`$f`は`(element, index, array)`の3つの引数を取ります。

	>>> _::map([1, 2, 3], function($x) {
	  return $x * 3;
	})
	=> [3, 6, 9]
	>>> _::map(['one' => 1, 'two' => 2, 'three' => 3], function($x) {
	  return $x * 3;
	})
	=> [3, 6, 9]
