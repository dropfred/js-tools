"use strict";

(() => {
    const SETTINGS = {
        rows: 15, cols: 40,
        min: 4,
        fmt: 80
    };

    const MAGIC        = "🔒";  // encrypted data magic prefix
    const BOOKMARKLET  = true;  // exit button
    const DOTS         = true;  // use password inputs
    const DND          = true;  // handle drag and drop
    const KBD          = true;  // handle ctrl-c and ctrl-s
    const DBG          = false; // log errors

    const DOC = document;
    const BODY = DOC.body;

    const append = (e, ...cs) => {for (const c of cs) e.appendChild(c); return e;};
    const remove = (e, ...cs) => {for (const c of cs) e.removeChild(c); return e;};
    const createElement = (t, c) => {
        const e = DOC.createElement(t);
        if (c) {
            if (c.id   ) e.id = c.id;
            if (c.class) e.classList.add(c.class);
            if (c.style) e.style.cssText += c.style;
            if (c.inner) e.innerHTML = c.inner;
        }
        return e;
    };
    const addListener = (e, t, h) => {e.addEventListener(t, h);};
    const removeListener = (e, t, h) => e.removeEventListener(t, h);
    const querySelectors = (e, s) => e.querySelectorAll(s);
    const preventDefault = e => e.preventDefault();
    const log = (...xs) => console.log(...xs);

    //
    // encrypt/decrypt
    //

    const SALT_OFFSET = 0;
    const SALT_SIZE = 16;

    const IV_OFFSET = SALT_OFFSET + SALT_SIZE;
    const IV_SIZE = 12;

    const DATA_OFFSET = IV_OFFSET + IV_SIZE;

    async function get_key(password, salt) {
        let key = await crypto.subtle.importKey(
            "raw",
            (new TextEncoder()).encode(password),
            {name: "PBKDF2"},
            false,
            ["deriveKey"]
        );
        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 600000,
                hash: "SHA-256"
            },
            key,
            {name: "AES-GCM", length: 256},
            false,
            ["encrypt", "decrypt"]
        );
    }

    async function encrypt(password, txt) {
        const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
        const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
        return get_key(password, salt).then(key =>
            crypto.subtle.encrypt({name: "AES-GCM", iv: iv}, key, (new TextEncoder()).encode(txt))
        ).then(data => {
            const buffer = new Uint8Array(SALT_SIZE + IV_SIZE + data.byteLength);
            buffer.set(salt, SALT_OFFSET);
            buffer.set(iv, IV_OFFSET);
            buffer.set(new Uint8Array(data), DATA_OFFSET);
            return (MAGIC + buffer.toBase64());
        });
    }

    async function decrypt(password, data64) {
        const buffer = Uint8Array.fromBase64(data64.slice(MAGIC.length));
        const salt = buffer.slice(SALT_OFFSET, SALT_OFFSET + SALT_SIZE);
        const iv = buffer.slice(IV_OFFSET, IV_OFFSET + IV_SIZE);
        const data = buffer.slice(DATA_OFFSET);
        return get_key(password, salt).then(key =>
            crypto.subtle.decrypt({name: "AES-GCM", iv: iv}, key, data)
        ).then(data =>
            (new TextDecoder()).decode(data)
        );
    }

    //
    // ui
    //

    // save and hide host page
    const BK = {ss: [], cs: []};
    for (const e of BODY.children) {
        BK.cs.push({e: e, d: e.style.display});
        e.style.display = "none";
    }
    for (const s of DOC.styleSheets) {
        BK.ss.push({s: s, d: s.disabled});
        s.disabled = true;
    }
    // restore host page
    const close = () => {
        remove(DOC.head, STYLE);
        for (const e of [TOP, DLG_PASSWORD, DLG_ERROR, DLG_BOOKMARK]) remove(BODY, e);

        for (const b of BK.ss) {
            b.s.disabled = b.d;
        }
        for (const b of BK.cs) {
            b.e.style.display = b.d;
        }
    };

    const STYLE = createElement("style", {
        inner: [
            "body {font-family: sans-serif;}",
            "input {font-family: monospace; text-align: center;}",
            ".hbox {display: flex;} .vbox {display: flex; flex-direction: column;}",
            "dialog {margin-top: 2em;} dialog button {min-width: 5em;}",
        ].join(" ")
    });
    append(DOC.head, STYLE);
 
    const TOP = createElement("div", {class: "hbox", style: "justify-content: center;"});

    const MAIN = append(createElement("div", {class: "vbox", style: "max-width: 100%; gap: 1em;"}),
        createElement("div", {
            class: "hbox",
            inner: `${["📂", "💾", "📋", "🔗", "📄", "🔓"].reduce(((a, c) => a + "<button>" + c + "</button>"), "")}${BOOKMARKLET ? `<span style="flex-grow: 1;"></span><button>❌</button>`: ''}`,
            style: "gap: 0.5em;"
        }),
        createElement("div", {inner: `<textarea rows="${SETTINGS.rows}" cols="${SETTINGS.cols}" placeholder="Edit/Drop" wrap="off" spellcheck="false"></textarea>`})
    );
    append(TOP, MAIN);

    const DLG_PASSWORD = createElement(
        "dialog", {
            inner:
                '<div class="vbox" style="gap: 1em;">' +
                    "<span>Password:</span>" +
                    `<input required minlength="${SETTINGS.min}" ${DOTS? 'placeholder="Enter password" type="password" ' : ""}/>` +
                    (DOTS? '<input placeholder="Confirm password" type="password"/>' : "") +
                    '<div class="hbox" style="gap: 1em;"><button>Ok</button><button>Cancel</button></div>' +
                "</div>"
        }
    );

    const DLG_ERROR = createElement(
        "dialog", {
            inner:
                '<div class="vbox" style="gap: 1em; align-items: center;">' +
                    "<span></span>" +
                    "<div><button>Close</button></div>" +
                "</div>",
            style: "border-color: red;"
        }
    );

    const DLG_BOOKMARK = createElement(
        "dialog", {
            inner:
                '<div class="vbox" style="gap: 1em; align-items: center;">' +
                    "<span>Save data as bookmark:</span>" +
                    '<a href="/">data</a>' +
                    "<div><button>Close</button></div>" +
                "</div>"
        }
    );

    append(BODY, TOP, DLG_PASSWORD, DLG_ERROR, DLG_BOOKMARK);

    const [MENU_OPEN, MENU_SAVE, MENU_COPY, MENU_LINK, MENU_PAGE, MENU_RAW, MENU_QUIT] = querySelectors(MAIN, "button");
    const [TEXT] = querySelectors(MAIN, "textarea");
    const [PW_OK, PW_CANCEL] = querySelectors(DLG_PASSWORD, "button");
    const [PW_ENTER, PW_CONFIRM] = querySelectors(DLG_PASSWORD, "input");
    const [BOOKMARK] = querySelectors(DLG_BOOKMARK, "a");

    //
    // handlers
    //

    const error = msg => {
        querySelectors(DLG_ERROR, "span")[0].innerHTML = msg;
        DLG_ERROR.showModal();
    };

    const format = (txt, length) => {
        if (length != 0) {
            let ftxt = "";
            for (let b = 0, e = length; b < txt.length; b = e, e += length) {
                if (b != 0) ftxt += "\n";
                ftxt += txt.slice(b, e);
            }
            txt = ftxt;
        }
        return txt;
    };

    const get_password = (confirm=true) => {
        return new Promise((resolve, reject) => {
            const clear = () => {
                removeListener(DLG_PASSWORD, "cancel", cancel);
                removeListener(PW_ENTER, "keyup", keyup);
                if (DOTS) if (confirm) removeListener(PW_CONFIRM, "keyup", keyup);
                removeListener(PW_OK, "click", ok);
                removeListener(PW_CANCEL, "click", cancel);
                DLG_PASSWORD.close();
            };

            const ok = () => {
                clear();
                resolve(PW_ENTER.value);
            };

            const cancel = () => {
                clear();
                reject();
            };

            const keyup = evt => {
                let valid = !confirm || (PW_ENTER.value.length >= SETTINGS.min);
                if (DOTS) if (confirm) {
                    valid &&= PW_ENTER.value == PW_CONFIRM.value;
                }
                PW_OK.disabled = !valid;
                if (evt.key === "Enter") {
                    if (valid) ok();
                    else if (confirm) {
                        if (!PW_ENTER.reportValidity()) PW_ENTER.focus();
                        else PW_CONFIRM.focus();
                    }
                }
            };

            addListener(DLG_PASSWORD, "cancel", cancel);

            addListener(PW_ENTER, "keyup", keyup);
            if (DOTS) {
                if (confirm) addListener(PW_CONFIRM, "keyup", keyup);
                PW_CONFIRM.style.display = confirm? "" : "none";
            }

            addListener(PW_OK, "click", ok);
            addListener(PW_CANCEL, "click", cancel);

            PW_ENTER.value = "";
            if (DOTS) PW_CONFIRM.value = "";
            PW_OK.disabled = confirm;

            DLG_PASSWORD.showModal();
        });
    };

    const raw = () => MENU_RAW.style.borderStyle.length > 0;

    MENU_RAW.onclick = evt => {
        if (raw()) {
            MENU_RAW.style.backgroundColor = "";
            MENU_RAW.style.borderStyle = "";
        } else {
            MENU_RAW.style.backgroundColor = "orange";
            MENU_RAW.style.borderStyle = "groove";
        }
    };

    async function update(data, clear) {
        const update = txt => {
            if (clear) TEXT.value = "";
            const position = TEXT.selectionStart;
            TEXT.value = TEXT.value.slice(0, position) + txt + TEXT.value.slice(TEXT.selectionEnd);
            TEXT.selectionStart = TEXT.selectionEnd = position + txt.length;
        };

        if (!raw() && data.startsWith(MAGIC) && (data != MAGIC)) {
            get_password(false).then(pw =>
                decrypt(pw, data)
            ).then(txt => {
                update(txt);
            }).catch(e => {
                if (e) {
                    error("Invalid password or<br />corrupted data.");
                }
            });
        } else {
            update(data);
        }
    }

    const transfer = (data) => {
        const items = [...data.items];
        (
            (items.some(i => i.kind === "string"))? Promise.resolve({data: data.getData("text/plain"), clear: false}) :
            (items.some(i => i.kind === "file"))  ? data.files.item(0).text().then(d => Promise.resolve({data: d, clear: true})) :
                                                    Promise.reject(/*ignore*/)
        ).then(t => {
            update(t.data, t.clear);
        }).catch(e => DBG && e && log(e));
    };

    const ui_encrypt = handler => {
        const b = TEXT.selectionStart, e = TEXT.selectionEnd;
        const d = (b == e) ? TEXT.value : TEXT.value.slice(b, e);
        (raw() ? Promise.resolve(d) : get_password().then(pw => encrypt(pw, d))).then(handler).catch(e => DBG && e && log(e));
    };

    const copy = () => {
        ui_encrypt(d => {navigator.clipboard.writeText(format(d, SETTINGS.fmt));});
    };

    const bookmark = link => {
        ui_encrypt(d => {
            BOOKMARK.href = link(d);
            DLG_BOOKMARK.showModal();
        });
    };

    const link = () => {
        bookmark(d => "javascript:" + encodeURIComponent(`navigator.clipboard.writeText("${d}");`));
    };

    const page = () => {
        bookmark(d => "data:text/plain;charset=utf-8," + encodeURIComponent(d));
    };

    const open = () => {
        const f = createElement("input");
        f.type = "file";
        f.style.display = "none";
        f.addEventListener("change", evt => {
            const p = evt.target.files[0];
            const r = new FileReader();

            r.onload = () => {
                update(r.result, true);
            };

            r.onerror = () => {
                error("Could not read file.");
            };

            r.readAsText(p);
            f.remove();
        });
        append(BODY, f);
        f.click();
    };

    const save = () => {
        ui_encrypt(data64 => {
            const blob = new Blob([format(data64, SETTINGS.fmt)], {type: "text/plain"});
            const url = URL.createObjectURL(blob);
            const a = createElement("a");
            a.href = url;
            a.download = "ez-safe.txt";
            append(BODY, a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });
    };

    if (BOOKMARKLET) {
        addListener(MENU_QUIT, "click", close);
    }

    for (const d of [DLG_ERROR, DLG_BOOKMARK]) {
        addListener(querySelectors(d, "button")[0], "click", () => {d.close();});
    }

    for (const [m, h] of [
        [MENU_OPEN, open],
        [MENU_SAVE, save],
        [MENU_COPY, copy],
        [MENU_LINK, link],
        [MENU_PAGE, page],
        [BOOKMARK, preventDefault]
    ]) {
        m.onclick = h;
    }

    addListener(TEXT, "paste", evt => {
        preventDefault(evt);
        transfer(evt.clipboardData);
    });

    if (DND) {
        addListener(BODY, "dragover", preventDefault);

        addListener(BODY, "drop", evt => {
            preventDefault(evt);
            transfer(evt.dataTransfer);
        });
    }

    if (KBD) {
        addListener(TEXT, "keydown", evt => {
            if (evt.ctrlKey) {
                if (evt.key == "s") {
                    preventDefault(evt);
                    save();
                } else if (evt.key == "o") {
                    preventDefault(evt);
                    open();
                } else if (evt.key == "C") {
                    preventDefault(evt);
                    copy();
                }
            }
        });
    }

    //
    // check if crypto is available, disable everything otherwise
    //

    if (!crypto.subtle) {
        [MENU_COPY, MENU_SAVE, TEXT].forEach(e => e.disabled = true);
        TEXT.placeholder = "Insecure context"
        TEXT.style.color = "red";
    }
})();
