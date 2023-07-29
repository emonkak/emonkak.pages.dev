---
title: Why you should use wcwidth() to calculate a character width
date: 2023-07-05
template: article.js
language: en
tags:
  - linux
---

## TL;DR

- Character width depends on the font, and Unicode Consortium does not provide explicit width definitions for all characters.
- There are characters that have ambiguous widths other than those defined as "Ambiguous (A)" in [EastAsianWidth.txt](https://unicode.org/Public/UNIDATA/EastAsianWidth.txt). For example, "☀ (U+2600)" is defined as "Neutral (N)" in EastAsianWidth.txt, but its width may be full-width in a CJK font or an emoji font. This means that a non-East Asian character may be also the ambiguous-width character.
- Character width tables in default locales is problematic for both CJK and non-CJK users. You can create a custom locale to define a better character width table.
- `wcwidth()` respects  defined by the locale. All TUI applications should consistently use `wcwidth()` to calculate the width of the character without an embedded character width table. If there is a mismatch in character width between applications, the screen will be broken.

## Introduction

Modern TUI applications provide a rich UI using some Unicode characters, such as Box Drawing (U+2500..U+257F), beyond the ASCII code range. However, the difference between  expected by the application and the character width actually rendered is often a problem. "East Asia Ambiguous Width" is well known as one of the causes for this problem, but it is not all. This problem maybe affects all users who use Unicode (emoji is also one of the causes).

Currently, there is no way to specify the character width to be rendered in the terminal by the application, so we can only respect the character width defined by the locale. If so users can create custom locales and define character widths that suit their environment (character widths are controlled by the user, not the application).

In this article, I explain why applications should use locale-dependent character widths by `wcwidth()`, and how users can create custom locales.

## Calculating character widths

In glibc, table of the locale is automatically generated by [utf8\_gen.py](https://sourceware.org/git/?p=glibc.git;a=blob;f=localedata/unicode-gen/utf8_gen.py;h=b48dc2aaa451f1f94fa9417ae0c475460d2843d4;hb=a704fd9a133bfb10510e18702f48a6a9c88dbbd5) based on the information defined by the Unicode Consortium as follows:

- If a [East Asian Width](https://www.unicode.org/reports/tr11/tr11-40.html) is "Wide (W)" or "Fullwidth (F)" in [EastAsianWidth.txt](https://unicode.org/Public/UNIDATA/EastAsianWidth.txt), a character is full-width.
- If a [Bidirectional Category](https://unicode.org/reports/tr9/#Bidirectional_Character_Types) is "Nonspacing Mark (NSM)" in [UnicodeData.txt](https://unicode.org/Public/UNIDATA/UnicodeData.txt), a character is zero-width.
- If a [General Category](https://unicode.org/reports/tr44/#General_Category_Values) is "Format Control (Cf)", "Enclosing Mark (Me)" or "Nonspacing Mark (Mn)" in [UnicodeData.txt](https://unicode.org/Public/UNIDATA/UnicodeData.txt), a character is zero-width.
- If a character has [Prepended_Concatenation_Mark](https://unicode.org/reports/tr44/#Prepended_Concatenation_Mark) property defined in [PropList.txt](https://unicode.org/Public/UNIDATA/PropList.txt), it is zero-width.
- If a character is the control character defined in [CTYPE](https://sourceware.org/git/?p=glibc.git;a=blob;f=localedata/locales/i18n_ctype;h=850c902cc1b32e51b65a0a5c45d3587f0677824c;hb=a704fd9a133bfb10510e18702f48a6a9c88dbbd5#l518), it is zero-width (this width will not be output to table).
- Otherwise a character is half-width.

It is well known that this character width table can cause problems in the environments of East Asian users, as the characters whose "East Asian Width" is "Ambiguous" will be half-width. Therefore, some applications, such as Vim and iTerm2, have a option to set these characters to full-width.

In fact, not all "Ambiguous" characters have a full width, even in CJK fonts. Even so, displaying half-width characters as full-width characters often works well (although there is white-space). One exception is the characters of Box Drawing (U+2500..U+257f). When these characters are drawn as full-width, the screen may break.

In addition, characters that have ambiguous width also exist in non-East Asian characters defined as "Natural (N)" in EastAsianWidth.txt. For example, the widths of the following characters can be either full-width or half-width (note that "-" represents the absence of a glyph):

| Chracter | Code Point | Width (Consolas) | Width (Menlo) | Width (Meiryo) | Width (Hiragino Sans)
| -------- | ---------- | ---------------- | ------------- | -------------- | ---------------------
| ☀       | U+2600     | -                | 1             | 2              | 2
| ☁       | U+2601     | -                | 1             | 2              | 2
| ☂       | U+2602     | -                | 1             | 2              | 2
| ☃       | U+2603     | -                | 1             | 2              | 2
| ☄       | U+2604     | -                | 1             | 2              | -

**Caption:** Ambiguous width characters ([Here](./ambiguous_width_characters.txt) is a list of all)

Therefore, to draw characters correctly on the screen, it is necessary to have a way to set the width of characters more flexibly. We already have that way. It is locale.

## Using a custom locale

Linux or MacOS(BSD) operating systems can get the width of a character defined in the locale using `wcwidth()`. You can adjust the behavior of applications that call `wcwidth()` by using a custom locale.

However, there are many applications that use embedded character width tables that are independent of the locale. So that applications may have different character width tables between each other, and the inconsistency often causes problems. Therefore, **all applications should consistently use `wcwidth()` to calculate the width of the character.**

The way to create a custom locale differs between Linux and BSD. The scripts to do this is available in the following repository:

> [emonkak/locale-patchers: Some small scripts for updating a character width table for the locale](https://github.com/emonkak/locale-patchers)

You can create custom locales for Linux and MacOS with the default config using those scripts as follows:

```shell
git clone https://github.com/emonkak/locale-patchers.git
cd locale-patchers
# Download latest "UTF-8" charmap and "en_US.UTF-8.src" ctype,
# and then create # "UTF-8-PATCHED" and "en_US.UTF-8-PATCHED.src".
make
```

To use a custom locale created in Linux, follow this step:

```shell
sudo localedef -i en_US -c -f UTF-8-PATCHED en_US.UTF-8
```

Or overwrite the existing locale:

```shell
gzip -c UTF-8-PATCHED | sudo dd of=/usr/share/i18n/charmaps/UTF-8.gz
sudo sh -c 'cd / && locale-gen'
```

If you are using MacOS, follow these steps:

```shell
mkdir -p ~/.locale/UTF-8
mklocale -o ~/.locale/UTF-8/LC_CTYPE en_US.UTF-8-PATCHED.src
cat > ~/Library/LaunchAgents/setup-locale.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>setup-locale</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/launchctl</string>
    <string>setenv</string>
    <string>PATH_LOCALE</string>
    <string>/Users/YOUR_USER_NAME/.locale</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
EOF
launchctl load -w ~/Library/LaunchAgents/setup-locale.plist
```

I recommend you follow those steps to unify the character width table of the locale on all systems you SSH into. Mismatched character widths can cause the screen to break.

The default config make the following changes to a character width table (of course you can change them). In this config, regardless of the East Asian Width property, full-width characters are specified for some [block](https://unicode.org/Public/UNIDATA/Blocks.txt):

| Code Start | Code End   | Width            | Note                                                                                                                     |
| ---------- | ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| U+2010     | U+2027     | 2                | [General Punctuation](https://en.wikipedia.org/wiki/General_Punctuation) (HYPHEN ... HYPHENATION POINT)                  |
| U+2030     | U+205E     | 2                | [General Punctuation](https://en.wikipedia.org/wiki/General_Punctuation) (PER MILLE SIGN ... VERTICAL FOUR DOTS)         |
| U+25A0     | U+25FF     | 2                | [Geometric Shapes](https://en.wikipedia.org/wiki/Geometric_Shapes_(Unicode_block))                                       |
| U+2600     | U+26FF     | 2                | [Miscellaneous Symbols](https://en.wikipedia.org/wiki/Miscellaneous_Symbols)                                             |
| U+2700     | U+27BF     | 2                | [Dingbats](https://en.wikipedia.org/wiki/Dingbats_(Unicode_block))                                                       |
| U+FFFC     | U+FFFD     | 2                | [Specials](https://en.wikipedia.org/wiki/Specials_(Unicode_block)) (OBJECT REPLACEMENT CHARACTER, REPLACEMENT CHARACTER) |
| U+1F000    | U+1F02F    | 2                | [Mahjong Tiles](https://en.wikipedia.org/wiki/Mahjong_Tiles_(Unicode_block))                                             |
| U+1F030    | U+1F09F    | 2                | [Domino Tiles](https://en.wikipedia.org/wiki/Domino_Tiles)                                                               |
| U+1F0A0    | U+1F0FF    | 2                | [Playing Cards](https://en.wikipedia.org/wiki/Playing_Cards_(Unicode_block))                                             |
| U+1F100    | U+1F1FF    | 2                | [Enclosed Alphanumeric Supplement](https://en.wikipedia.org/wiki/Enclosed_Alphanumeric_Supplement)                       |
| U+1F200    | U+1F2FF    | 2                | [Enclosed Ideographic Supplement](https://en.wikipedia.org/wiki/Enclosed_Ideographic_Supplement)                         |
| U+1F300    | U+1F5FF    | 2                | [Miscellaneous Symbols and Pictographs](https://en.wikipedia.org/wiki/Miscellaneous_Symbols_and_Pictographs)             |
| U+1F600    | U+1F64F    | 2                | [Emoticons](https://en.wikipedia.org/wiki/Emoticons_(Unicode_block))                                                     |
| U+1F650    | U+1F67F    | 2                | [Ornamental Dingbats](https://en.wikipedia.org/wiki/Ornamental_Dingbats)                                                 |
| U+1F680    | U+1F6FF    | 2                | [Transport and Map Symbols](https://en.wikipedia.org/wiki/Transport_and_Map_Symbols)                                     |
| U+1F700    | U+1F77F    | 2                | [Alchemical Symbols](https://en.wikipedia.org/wiki/Alchemical_Symbols_(Unicode_block))                                   |
| U+1F780    | U+1F7FF    | 2                | [Geometric Shapes Extended](https://en.wikipedia.org/wiki/Geometric_Shapes_Extended)                                     |
| U+1F800    | U+1F8FF    | 2                | [Supplemental Arrows-C](https://en.wikipedia.org/wiki/Supplemental_Arrows-C)                                             |
| U+1F900    | U+1F9FF    | 2                | [Supplemental Symbols and Pictographs](https://en.wikipedia.org/wiki/Supplemental_Symbols_and_Pictographs)               |
| U+1FA00    | U+1FA6F    | 2                | [Chess Symbols](https://en.wikipedia.org/wiki/Chess_symbols_in_Unicode)                                                  |
| U+1FA70    | U+1FAFF    | 2                | [Symbols and Pictographs Extended-A](https://en.wikipedia.org/wiki/Symbols_and_Pictographs_Extended-A)                   |
| U+1FB00    | U+1FBFF    | 2                | [Symbols for Legacy Computing](https://en.wikipedia.org/wiki/Symbols_for_Legacy_Computing)                               |

This config solves some problems with the traditional approach of treating all East Asian ambiguous characters as full-width:

- Box Drawing characters are kept half-width, so the screen does not break in TUI applications.
- Some symbols (emojis), such as "☀ (U+2600)", which are non-East Asian character, are changed into full-width. These symbols are usually rendered half-width on MacOS, but it is better to unify them in full-width for interoperability with Linux (consider connecting to Linux from MacOS via SSH).
- Some Latin and Cyrillic characters are kept half-width, therefore it is also suitable for non-CJK users.

> **Note:** Calculate the character width based on the fonts
>
> What about an approach that calculates the width of a character based on the font? This approach perfectly matches the actual width of the character as it is displayed on the screen. However, it is difficult to implement for the following reasons:
>
> - A font may not contain the glyph for the particular character. In this case, the API must fallback to another font. If the glyph is still not found, which character width should be fallback to? It is probably `wcwidth()` or a embedded character table.
> - Only the terminal knows which font is used to draw the characters. Therefore, the application must query the terminal for the character width through the API. That means the remote application via SSH must communicate with the host terminal over the network.

## Patches to use wcwidth()

Applications calculate the width of characters in different ways. I would like all applications can provide a way to use a character table in the locale, but in reality, many applications use embedded character width tables. I wrote a patch to force those applications to use `wcwidth()` (on Gentoo Linux, there is [a useful way](https://wiki.gentoo.org/wiki//etc/portage/patches) to automatically apply patches in a specific directory when building packages).

| Application            | Use `wcwidth()` | Patch                   | Related Issues                |
| ---------------------- | --------------- | ----------------------- | ----------------------------- |
| [Alacritty][alacritty] | No              | [Link][alacritty-patch] | [#1295][alacritty-issue-2195] |
| [iTerm2][iterm2]       | No              | [Link][iterm2-patch]    |                               |
| [NeoVim][neovim]       | No              | [Link][neovim-patch]    |                               |
| [Vim][vim]             | No [^1]         | [Link][vim-patch]       | [#4380][vim-issue-4380]       |
| [Zsh][zsh]             | No [^2]         | [Link][zsh-patch]       |                               |
| [tmux][tmux]           | Yes [^3]        |                         |                               |

[alacritty]: https://alacritty.org/
[alacritty-issue-2195]: https://github.com/alacritty/alacritty/issues/1295
[alacritty-patch]: https://github.com/emonkak/config/blob/master/gentoo/etc/portage/patches/x11-terms/alacritty/wcwidth.patch
[iterm2]: https://iterm2.com/
[iterm2-patch]: https://gist.github.com/emonkak/d6f8334261adb4618c5879621a644dd5
[neovim]: https://neovim.io/
[neovim-patch]: https://github.com/emonkak/config/blob/master/gentoo/etc/portage/patches/app-editors/neovim/wcwidth.patch
[vim]: https://www.vim.org/
[vim-issue-4380]: https://github.com/vim/vim/issues/4380
[vim-patch]: https://github.com/emonkak/config/blob/master/gentoo/etc/portage/patches/app-editors/vim/wcwidth.patch
[zsh]: https://www.zsh.org/
[zsh-patch]: https://github.com/emonkak/config/blob/master/gentoo/etc/portage/patches/app-shells/zsh/wcwidth.patch
[tmux]: https://github.com/tmux/tmux

[^1]: You can enable `USE_WCHAR_FUNCTIONS` option to use `wcwidth()`, but there is no flag to enable it in the configure script. see the [source](https://github.com/vim/vim/blob/d392a74c5a8af8271a33a20d37ae1a8ea422cb4b/src/mbyte.c#L1609) for details.
[^2]: You need to disable `--enable-unicode9` flag, but it will be enabled by the configure script. See the [source](https://github.com/zsh-users/zsh/blob/73d317384c9225e46d66444f93b46f0fbe7084ef/configure.ac#L2612) for details.
[^3]: On macOS, you need to configure with `--disable-utf8proc` flag. See the [source](https://github.com/tmux/tmux/blob/87fe00e8b44901240fc22d7120c1b31e4331f6f5/configure.ac#L839) for details.

## Conclusion

We can adjust the character width drawn in the terminal using a custom locale. However, for this to work correctly, applications must consistently use `wcwidth()` to get character width in the locale. I believe that all TUI applications should provide a way to use `wcwidth()`.

If an application has an embedded character width table, it must also be updated every time Unicode is updated. This should be the responsibility of the locale, not the application. It is nonsense for TUI application developers to deal with problems of symbols and emojis not being rendered correctly. Leave it to the locale!.