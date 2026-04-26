"use strict";

(() => {
    const BG     = "white";
    const BORDER = "lightgray";
    const CLOSE  = "none";

    const MAGIC        = "🔒";  // encrypted data magic prefix
    const BOOKMARKLET  = true;  // exit button
    const DOTS         = true;  // use password inputs
    const DND          = true;  // handle drag and drop
    const KBD          = true;  // handle ctrl-c and ctrl-s
    const DBG          = false; // log errors
    const FMT          = 80;    // formatting max length (0 means no formatting)

    const DOC = document;
    const BODY = DOC.body;

    const append = (e, ...cs) => {for (const c of cs) e.appendChild(c); return e;};
    const remove = (e, ...cs) => {for (const c of cs) e.removeChild(c); return e;};
    const createElement = (t, c) => {
        const e = DOC.createElement(t);
        if (c) {
            if (c.id   ) e.id = c.id;
            if (c.class) {for (const n of c.class.split(/\s+/)) e.classList.add(n);}
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

    const lock = (() => {
        const SALT_OFFSET = 0;
        const SALT_SIZE = 16;

        const IV_OFFSET = SALT_OFFSET + SALT_SIZE;
        const IV_SIZE = 12;

        const DATA_OFFSET = IV_OFFSET + IV_SIZE;

        async function key(password, salt) {
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

        async function encrypt(pw, txt) {
            const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
            const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
            return key(pw, salt).then(key =>
                crypto.subtle.encrypt({name: "AES-GCM", iv: iv}, key, (new TextEncoder()).encode(txt))
            ).then(data => {
                const buffer = new Uint8Array(SALT_SIZE + IV_SIZE + data.byteLength);
                buffer.set(salt, SALT_OFFSET);
                buffer.set(iv, IV_OFFSET);
                buffer.set(new Uint8Array(data), DATA_OFFSET);
                return (MAGIC + buffer.toBase64());
            });
        }

        async function decrypt(pw, data64) {
            const buffer = Uint8Array.fromBase64(data64.slice(MAGIC.length));
            const salt = buffer.slice(SALT_OFFSET, SALT_OFFSET + SALT_SIZE);
            const iv = buffer.slice(IV_OFFSET, IV_OFFSET + IV_SIZE);
            const data = buffer.slice(DATA_OFFSET);
            return key(pw, salt).then(key =>
                crypto.subtle.decrypt({name: "AES-GCM", iv: iv}, key, data)
            ).then(data =>
                (new TextDecoder()).decode(data)
            );
        }

        return {encrypt, decrypt};
    })();

    //
    // ui
    //

    // save and hide host page
    const BK = {ss: [], cs: [], f: DOC.activeElement};
    for (const e of BODY.children) {
        BK.cs.push({e: e, d: e.style.display});
        e.style.display = "none";
    }
    for (const s of DOC.styleSheets) {
        BK.ss.push({s: s, d: s.disabled});
        s.disabled = true;
    }

    const STYLE = createElement("style", {
        inner: [
            "body {font-family: sans-serif;}",
            "input {font-family: monospace; text-align: center;}",
            "button {font-size: large;}",
            "button:disabled {opacity: 0.5;}",
            "dialog {margin-top: 2em; padding: 0.5em;}",
            "dialog::backdrop {backdrop-filter: blur(2px);}",
            `hr {width: 100%; border-color: ${BORDER}; opacity: 0.5;}`,
            "textarea {min-width: 25em; min-height: 15em;}",
            ".hbox {display: flex; gap: 0.5em;}",
            ".vbox {display: flex; flex-direction: column; gap: 0.5em;}",
            ".txt {justify-content: center;}",
            ".txt button {min-width: 3em;}",
            `.top {margin-top: 0.5em; border-width: 2px; border-color: ${BORDER};}`,
            `.top::backdrop {background: ${BG}; backdrop-filter: none;}`
        ].join(" ")
    });
    append(DOC.head, STYLE);
 
    const TOP = createElement("div");

    const MAIN = append(createElement("dialog", {class: "top"}), append(createElement("div", {class: "vbox"}),
        createElement("div", {
            class: "hbox",
            inner: `${["📂", "💾", "📋", "🔗", "🔓"].reduce(((a, c) => a + "<button>" + c + "</button>"), "")}${BOOKMARKLET ? `<span style="flex-grow: 1;"></span><button>❌</button>`: ''}`
        }),
        createElement("hr"),
        createElement("div", {inner: `<textarea placeholder="Edit/Drop" wrap="off" spellcheck="false"></textarea>`})
    ));
    if (CLOSE) MAIN.closedBy = CLOSE;

    const DLG_PASSWORD = createElement(
        "dialog", {
            inner:
                '<div class="vbox" style="gap: 1em;">' +
                    '<div class="vbox">' +
                        "<b>Password:</b>" +
                        `<input required minlength="4" ${DOTS? 'placeholder="Enter password" type="password" ' : ""}/>` +
                        (DOTS? '<input placeholder="Confirm password" type="password"/>' : "") +
                    "</div>" +
                    '<div class="hbox txt"><button>✔️</button><button>❌</button></div>' +
                "</div>"
        }
    );

    const DLG_ERROR = createElement(
        "dialog", {
            inner:
                '<div class="vbox" style="gap: 1em; align-items: center;">' +
                    '<output style="text-align: center;"></output>' +
                    '<div class="hbox txt"><button>✖️</button></div>' +
                "</div>",
            style: "border-color: red;"
        }
    );

    const DLG_BOOKMARK = createElement(
        "dialog", {
            inner:
                '<div class="vbox" style="gap: 1em; align-items: center;">' +
                    "<b>Save as bookmark:</b>" +
                    '<a href="/">clipboard</a>' +
                    '<a href="/">data</a>' +
                    '<div class="hbox txt"><button>✖️</button></div>' +
                "</div>"
        }
    );

    append(BODY, append(TOP, MAIN, DLG_PASSWORD, DLG_ERROR, DLG_BOOKMARK));

    const [MENU_OPEN, MENU_SAVE, MENU_COPY, MENU_BOOKMARK, MENU_RAW, MENU_QUIT] = querySelectors(MAIN, "button");
    const [TEXT] = querySelectors(MAIN, "textarea");
    const [PW_OK, PW_CANCEL] = querySelectors(DLG_PASSWORD, "button");
    const [PW_ENTER, PW_CONFIRM] = querySelectors(DLG_PASSWORD, "input");
    const [BOOKMARK_CLIPBOARD, BOOKMARK_DATA] = querySelectors(DLG_BOOKMARK, "a");

    //
    // handlers
    //

    // restore host page
    const close = () => {
        remove(DOC.head, STYLE);
        remove(BODY, TOP);

        for (const b of BK.ss) {
            b.s.disabled = b.d;
        }
        for (const b of BK.cs) {
            b.e.style.display = b.d;
        }
        if (BK.f) BK.f.focus();
    };

    const error = msg => {
        querySelectors(DLG_ERROR, "output")[0].innerHTML = msg;
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

    const password = (confirm=true) => {
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
                let valid = !confirm || (PW_ENTER.value.length >= 4);
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
            password(false).then(pw =>
                lock.decrypt(pw, data)
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

    const transfer = (data, clear) => {
        const items = [...data.items];
        (
            (items.some(i => i.kind === "string"))? Promise.resolve(data.getData("text/plain")) :
            (items.some(i => i.kind === "file"))  ? data.files.item(0).text() :
                                                    Promise.reject(/*ignore*/)
        ).then(data => {
            update(data, clear);
        }).catch(e => DBG && e && log(e));
    };

    const data = handler => {
        const b = TEXT.selectionStart, e = TEXT.selectionEnd;
        const d = (b == e) ? TEXT.value : TEXT.value.slice(b, e);
        (raw() ? Promise.resolve(d) : password().then(pw => lock.encrypt(pw, d))).then(handler).catch(e => DBG && e && log(e));
    };

    const copy = () => {
        data(d => {navigator.clipboard.writeText(format(d, FMT));});
    };

    const bookmark = link => {
        data(d => {
            const uri = encodeURIComponent(d);
            BOOKMARK_CLIPBOARD.href = `javascript:navigator.clipboard.writeText("${uri}")`;
            BOOKMARK_DATA.href = "data:text/plain;charset=utf-8," + uri;
            DLG_BOOKMARK.showModal();
        });
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
        data(d => {
            const blob = new Blob([format(d, FMT)], {type: "text/plain"});
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

    addListener(MAIN, "cancel", close);

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
        [MENU_BOOKMARK, bookmark],
        [BOOKMARK_CLIPBOARD, preventDefault],
        [BOOKMARK_DATA, preventDefault]
    ]) {
        m.onclick = h;
    }

    addListener(TEXT, "paste", evt => {
        preventDefault(evt);
        transfer(evt.clipboardData, false);
    });

    if (DND) {
        addListener(BODY, "dragover", preventDefault);

        addListener(BODY, "drop", evt => {
            preventDefault(evt);
            transfer(evt.dataTransfer, true);
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
        [MENU_OPEN, MENU_SAVE, MENU_COPY, MENU_BOOKMARK, MENU_RAW, TEXT].forEach(e => e.disabled = true);
        TEXT.placeholder = "Insecure context"
        TEXT.style.color = "red";
    }

    MAIN.showModal();
})();
