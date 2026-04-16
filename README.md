# js-tools

Mini tools running as bookmarklets I made for my personnal usage.

## ez-safe

Basic encryption/decryption pad.

_Note: Since `crypto` is used, a secure context (https) is required._

[live](https://dropfred.github.io/js-tools/ez-safe/index.html)

### Usage

- `📂` / `Ctrl-O`: Open a file and replace current text. Prompt for the password if the data is encrypted.
- `💾` / `Ctrl-S`: Save encrypted text to a file.
- `📋` / `Ctrl-Shift-C`: Copy encrypted text to to clipboard.
- `🔗`: Store encrypted text to a clipboard bookmark.
- `📄`: Store encrypted text to a page bookmark.
- `🔓`: Disable encryption/decryption.
- `Ctrl-V`: Insert at current position (if text) or replace (if file) clipboard data. Prompt for the password if the data is encrypted.
- `Drop`: Replace current text with dropped data. Prompt for the password if the data is encrypted.

### Code customization:

- `MAGIC`: Prefix string used to distinguish encrypted text from plain text. Defaults to `🔒`.
- `BOOKMARKLET`: Specify whether the code is intended to be used as a bookmarklet. Defaults to `true`.
- `DOTS`: Use `password` inputs if `true`, plain text otherwise. Defaults to `true`.
- `DND`: Drag and drop support if `true`. Defaults to `true`.
- `KBD`: Support for `ctrl-c` / `ctrl-v` and `ctrl-s` if `true`. Defaults to `true`.
- `DBG`: Log errors if `true`. Defaults to `false`.
- `SETTINGS`: specify default text area size, and Base64-encoded data line length (0 means no formatting). Defaults to `{cols: 40, rows: 30, fmt: 80}`

Disabling options slightly reduces the minified size.

### Known caveats

- The host page returns to the top when the bookmarklet is closed if no element is focused.

## ez-pw

Simple deterministic strong password generator. The generated password follows the usual rules (at least one lowercase and one uppercase letter, at least one digit, and at least one symbol), and can be re-created if needed using the same `{name, key}` pair. The names are not sensible and can safely be leaked with no dammage, and the key can be unique (one strong and easy to remember password stored in your brain only).

_Note: Since `crypto` is used, a secure context (https) is required._

[live](https://dropfred.github.io/js-tools/ez-pw/index.html)

### Usage

- `⚙️`: Open settings dialog.
- `📋`: Copy password to clipboard.
- `🔏`: Fill host page's passwords.

### Code customization:

- `HOST`: Pre-fill the hostname of the host page in the “Name” field. Defaults to `true`.
- `FILL`: Support to fill the passwords of the host page. Defaults to `true`.
- `KBD`: Support for `Escape` to close the bookmarklet. Defaults to `true`.
- `DOTS`: Use `password` input for the `Key` field if `true`, plain text otherwise. Defaults to `false`.

Disabling options slightly reduces the minified size.

### Known caveats

- The host page returns to the top when the bookmarklet is closed if no element is focused.
