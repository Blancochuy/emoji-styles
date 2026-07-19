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

### Fluent Emoji Animated

The official animated Fluent Emoji collection is also copyright Microsoft Corporation and licensed under the MIT License. The provider exposes only assets present in the pinned upstream catalog and falls back when an emoji has no official animation.

- Source: https://github.com/microsoft/fluentui-emoji-animated
- Pinned revision: `daa0365c09795789ed2bc6e8b228c97736cb6669`
- License: https://github.com/microsoft/fluentui-emoji-animated/blob/daa0365c09795789ed2bc6e8b228c97736cb6669/LICENSE
- Format: animated PNG, 256×256 pixels
- Modifications: none; the library resolves pinned upstream assets through GitHub's media endpoint

## Noto Emoji

Noto Emoji artwork is copyright Google LLC and contributors. PNG artwork is distributed under the Apache License 2.0; font files in the upstream project are separately covered by the SIL Open Font License.

- Source: https://github.com/googlefonts/noto-emoji
- Pinned revision: `8998f5dd683424a73e2314a8c1f1e359c19e8742`
- License: https://github.com/googlefonts/noto-emoji/blob/main/LICENSE
- Modifications: none; the library resolves the upstream PNG assets through jsDelivr

The Fluent and Noto files are not bundled in this repository. Applications using their CDN providers request those assets at runtime.

## SerenityOS Emoji

SerenityOS pixel-art emoji are copyright the SerenityOS developers and contributors and are licensed under the BSD 2-Clause License.

- Source: https://github.com/SerenityOS/serenity/tree/b490eb8b17499c02d67c3e4de360e6ea583dc09c/Base/res/emoji
- Pinned revision: `b490eb8b17499c02d67c3e4de360e6ea583dc09c`
- License: https://github.com/SerenityOS/serenity/blob/b490eb8b17499c02d67c3e4de360e6ea583dc09c/LICENSE
- Attribution: SerenityOS emoji artwork by the SerenityOS developers and contributors
- Modifications: none; the library resolves exact upstream PNG assets through jsDelivr
- Delivery note: the provider exposes 1,800 exact matches in the current Unicode Emoji 17.0 dataset and uses configured fallbacks for unsupported sequences

## Noto Animated Emoji

Noto Animated Emoji artwork is published by Google and contributors under the Creative Commons Attribution 4.0 International license.

- Source: https://googlefonts.github.io/noto-emoji-animation/
- License: https://creativecommons.org/licenses/by/4.0/
- Attribution: Noto Animated Emoji by Google and contributors
- Modifications: none; the opt-in preview provider requests animated WebP assets from Google Fonts at runtime
- Delivery note: Google exposes these assets through a rolling `latest` endpoint, so this provider is exported under `experimentalProviders` rather than the reproducible `publicProviders` set
