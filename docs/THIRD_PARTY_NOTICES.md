# Third-party notices

Emoji Styles source code is MIT licensed. Emoji artwork is licensed separately by its creators.

## Twemoji

Twemoji graphics are copyright Twitter and other contributors and are licensed under the Creative Commons Attribution 4.0 International license.

- Source: https://github.com/jdecked/twemoji
- Graphics license: https://github.com/jdecked/twemoji/blob/main/LICENSE-GRAPHICS
- License text: https://creativecommons.org/licenses/by/4.0/
- Modifications: none by this project

The private `emoji-styles-assets-twemoji` package contains 3,782 PNG files from version 15.1.0. The files are preserved byte-for-byte and accompanied by a checksum manifest.

## Unicode data

The `emoji-styles-data` package is generated from Unicode Emoji 17.0 `emoji-test.txt`, using the CLDR 48 ordering and English short names. The source file is pinned by URL and SHA-256 checksum.

- Source: https://www.unicode.org/Public/17.0.0/emoji/emoji-test.txt
- Unicode and Emoji version: 17.0
- CLDR version: 48
- License: https://www.unicode.org/license.txt

## Microsoft Fluent Emoji

Fluent Emoji artwork is copyright Microsoft Corporation and contributors and is licensed under the MIT License.

- Source: https://github.com/microsoft/fluentui-emoji
- Pinned revision: `62ecdc0d7ca5c6df32148c169556bc8d3782fca4`
- License: https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE
- Modifications: none; the library resolves the upstream assets through jsDelivr

## Noto Emoji

Noto Emoji artwork is copyright Google LLC and contributors. PNG artwork is distributed under the Apache License 2.0; font files in the upstream project are separately covered by the SIL Open Font License.

- Source: https://github.com/googlefonts/noto-emoji
- Pinned revision: `8998f5dd683424a73e2314a8c1f1e359c19e8742`
- License: https://github.com/googlefonts/noto-emoji/blob/main/LICENSE
- Modifications: none; the library resolves the upstream PNG assets through jsDelivr

The Fluent and Noto files are not bundled in this repository. Applications using their CDN providers request those assets at runtime.
