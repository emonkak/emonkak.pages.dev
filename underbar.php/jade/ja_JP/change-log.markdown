Change Log
----------

### 0.2.0 - Jul 30, 2013

- クラス構造を全面的に刷新
- 各`Iterator`の実装を改善
- [`Enumerable`](#Enumerable)をメソッドチェイン可能にした
- [`chain()`](#chain)で利用している`Wrapper`クラスを[`Enumerable`](#Enumerable)に依存した実装に変更
- [`chain()`](#chain)で集約関数呼び出した時などはメソッドチェインを自動的に中断するようにした
- `isArray()` `isTraversable()` `pop()` `scanl()` `scanr()` `shift()` `slice()` `span()` `unshift()`を削除
- `groupBy()` `countBy()`の`$isSorted`引数を削除

### 0.1.2 - Jul 27, 2013

- [`Enumerable`](#Enumerable)の可変長引数のメソッドが正しく動作していなかったのを修正

### 0.1.1 - Jul 25, 2013

- [`Enumerable`](#Enumerable)のデフォルトクラスを[`ArrayImpl`](#ArrayImpl)に変更して[`lazy()`](#lazy)メソッドを実装

### 0.1.0 - Jul 24, 2013

- Initial release
