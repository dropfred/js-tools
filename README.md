# js-tools

Mini tools running as bookmarklets I made for my personnal usage.

## ez-safe

Basic encryption/decryption pad.

_Note: Since `crypto` is used, a secure context (https) is required._

[live](https://dropfred.github.io/js-tools/ez-safe/index.html)

### Usage

- `📂` / `Ctrl-O`: Open a file and replace current content. Prompt for the password if the data is encrypted.
- `💾` / `Ctrl-S`: Save encrypted text to a file.
- `📋` / `Ctrl-Shift-C`: Copy encrypted text to the clipboard.
- `🔗`: Store encrypted text as a clipboard bookmark.
- `📄`: Store encrypted text as a data bookmark.
- `🔓`: Disable encryption/decryption.
- `Ctrl-V`: Insert clipboard data at current position. Prompt for the password if the data is encrypted.
- `Drop`: Replace content with dropped data. Prompt for the password if the data is encrypted.

### Code customization:

- `MAGIC`: Prefix string used to distinguish encrypted data from plain text. Defaults to `🔒`.
- `BOOKMARKLET`: Specify whether the code is intended to be used as a bookmarklet. Defaults to `true`.
- `DOTS`: Use `password` inputs if `true`, plain text otherwise. Defaults to `true`.
- `DND`: Drag and drop support if `true`. Defaults to `true`.
- `KBD`: Support for `ctrl-c` / `ctrl-v` and `ctrl-s` if `true`. Defaults to `true`.
- `DBG`: Log errors if `true`. Defaults to `false`.
- `SETTINGS`: specify default text area size, and Base64-encoded data line length (0 means no formatting). Defaults to `{cols: 40, rows: 30, fmt: 80}`

### Known caveats

- The host page returns to the top when the bookmarklet is closed if no element is focused.

## ez-pw

Simple deterministic strong password generator. The generated password follows the usual rules (at least one lowercase and one uppercase letter, at least one digit, and at least one symbol), and can be re-created if needed using the same `{name, key}` pair. The names are not sensible (can be stored, not a big deal if leaked), and the key can be unique (one strong easy to remember password stored in your head only).

_Note: Since `crypto` is used, a secure context (https) is required._

[live](https://dropfred.github.io/js-tools/ez-pw/index.html)

### Usage

- `⚙️`: Open the settings dialog.
- `📋`: Copy the password to the clipboard.
- `🔏`: Fill in all password fields in the host page.

### Code customization:

- `HOST`: Pre-fill the hostname of the host page in the “Name” field. Defaults to `true`.
- `FILL`: Support to fill the passwords of the host page. Defaults to `true`.
- `DOTS`: Use `password` inputs for the `Key` field if `true`, plain text otherwise. Defaults to `false`.

### Known caveats

- The host page returns to the top when the bookmarklet is closed if no element is focused.
