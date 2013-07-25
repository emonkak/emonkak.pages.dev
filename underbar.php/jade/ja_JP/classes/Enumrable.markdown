`Traversable`なクラスに[`Eager`](#Eager)の関数をmixinするためのトレイトです。
`lazy()`を呼び出すと以降の処理を[`Lazy`](#Lazy)の[`chain()`](#chain)を呼び出してメソッドチェインで処理できます。

```php
class Collection implements IteratorAggregate
{
    use Underbar\Enumerable;

    protected $array;

    public function __construct()
    {
        $this->array = func_get_args();
    }

    public function getIterator()
    {
        return new ArrayIterator($this->array);
    }
}

$collection = new Collection(1, 2, 3);
$collection->map(function($n) { return $n * 2; });
=> [2, 4, 6]

$twiceCycle = $collection
    ->lazy()
    ->cycle()
    ->map(function($n) { return $n * 2; })
    ->take(6)
    ->join(', ')
    ->value();
=> '2, 4, 6, 2, 4, 6'
```
