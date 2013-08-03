Underbar.phpの各実装での共通の手続きが定義された抽象クラスです。
すべての手続きはstaticメソッドとして定義されています。

以下が抽象メソッドの一覧です。

| Category      | Methods
|:--------------|:-------
| *Collections* | [`map()`](#map) [`filter()`](#filter) [`sortBy()`](#sortBy) [`groupBy()`](#groupBy) [`countBy()`](#countBy) [`memoize()`](#memoize) [`shuffle()`](#shuffle)
| *Arrays*      | [`firstN()`](#firstN) [`lastN()`](#lastN) [`initial()`](#initial) [`rest()`](#rest) [`takeWhile()`](#takeWhile) [`dropWhile()`](#dropWhile) [`unzip()`](#unzip) [`flatten()`](#flatten) [`intersection()`](#intersection) [`range()`](#range) [`cycle()`](#cycle) [`repeat()`](#repeat) [`iterate()`](#iterate) [`reverse()`](#reverse) [`sort()`](#sort) [`concat()`](#concat)
