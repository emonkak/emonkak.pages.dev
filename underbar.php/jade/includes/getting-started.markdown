Underbar.phpの動作にはバージョン5.3以上のPHP処理系と、[Composer](http://getcomposer.org/)が必要です。
インストールが完了したらプロジェクトルートに以下のような内容のcomposer.jsonを作成します。
詳しいcomposer.jsonの書き方については[こちら](http://getcomposer.org/doc/04-schema.md)を参照して下さい。

	{
	    "require": {
	        "emonkak/underbar.php": "dev-master"
	    }
	}

composer.jsonを作成したら同じディレクトリで`$ php composer.phar install`を実行するとUnderbar.phpのインストールは完了します。
