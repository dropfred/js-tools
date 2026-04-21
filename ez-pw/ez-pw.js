"use strict";

(() => {
    //
    // options
    //

    const SETTINGS = {
        SYMBOLS: "!?+-*/%&@$#",
        SIZE   : 16,
        EXTRA  : "",
    };

    const HOST = true;
    const FILL = true;
    const DOTS = false;

    //
    // help minifier
    //

    const DOC = document;
    const BODY = DOC.body;
    const createElement = (t, c) => {
        const e = DOC.createElement(t);
        if (c) {
            if (c.id   ) e.id = c.id;
            if (c.class) {for (const n of c.class.split(" ")) e.classList.add(n);}
            if (c.style) e.style.cssText += c.style;
            if (c.inner) e.innerHTML = c.inner;
        }
        return e;
    };
    const append = (e, ...cs) => {for (const c of cs) e.appendChild(c); return e;};
    const remove = (e, ...cs) => {for (const c of cs) e.removeChild(c); return e;};
    const addListener = (e, t, h) => {e.addEventListener(t, h);};
    const querySelectorAll = (e, s) => e.querySelectorAll(s);
    const length = xs => xs.length;

    //
    // password creation
    //

    const rotate = (s, n) => {
        let a = n % length(s);
        let b = (a > 0) ? (length(s) - a) : -a;
        return (s.substr(b, length(s)) + s.substr(0, b));
    };

    async function hash() {
        const alpha = "abcdefghijklmnopqrstuvwxyz";
        const ALPHA = alpha.toUpperCase();
        const digits = "0123456789";
        const syms = SETTINGS.SYMBOLS;
        const chars = alpha + ALPHA + digits + syms;

        return crypto.subtle.digest("SHA-256", new TextEncoder().encode(NAME.value.trim() + KEY.value.trim() + SETTINGS.EXTRA)).then(b => {
            return Array.from(new Uint8Array(b));
        }).then((bs) => {
            let s = bs[27] % 256;
            let h = "";
            for (let i = (syms.length? 4 : 3); i < SETTINGS.SIZE; ++i) {
                h += chars[(bs[i % length(bs)] + s) % length(chars)];
                s = (s + (256 % length(chars))) % 256;
            }
            h = rotate(h + alpha[bs[0] % length(alpha)], bs[31]);
            h = rotate(h + ALPHA[bs[1] % length(ALPHA)], bs[30]);
            h = rotate(h + digits[bs[2] % length(digits)], bs[29]);
            if (syms.length) h = rotate(h + syms[bs[3] % length(syms)], bs[28]);
            return h;
        });
    }

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

    const PWDS = [...querySelectorAll(BODY, "input")].filter(i => i.type === "password");

    const STYLE = createElement("style", {
        inner: [
            "body {font-family: sans-serif;}",
            "input {font-family: monospace; text-align: center;}",
            "dialog {margin-top: 2em; padding: 0.5em;}",
            "dialog::backdrop {backdrop-filter: blur(2px);}",
            ".hbox {display: flex;} .vbox {display: flex; flex-direction: column;} .vbox .vbox {gap: 0.25em;}",
            ".large button {min-width: 3em;}",
            ".top {margin-top: 0.5em; border-width: 2px; border-color: lightgray;}",
            ".top::backdrop {background: none;}"
        ].join(" ")
    });
    append(DOC.head, STYLE);

    const TOP = createElement("dialog", {class: "top"});
    append(BODY, TOP);

    const MAIN = createElement("div", {class: "vbox", style: "gap: 1em;"});

    append(MAIN, append(createElement("div", {class: "hbox", style: "gap: 0.5em;"}),
        createElement("button", {inner: "⚙️"}),
        createElement("button", {inner: "📋"}),
        createElement("button", FILL? {inner: "🔏"} : {style: "display: none;"}),
        createElement("span", {style: "flex-grow: 1;"}),
        createElement("button", {inner: "❌"})
    ));

    append(MAIN, append(createElement("div", {class: "vbox", style: "gap: 1em;"}),
        createElement("div", {class: "vbox", inner: "<span>Name:</span><input />"}),
        createElement("div", {class: "vbox", inner: "<span>Key:</span><input /><input />"}),
        createElement("div", {class: "vbox", inner: "<span>Password:</span><input />"})
    ));
 
    append(TOP, MAIN);

    const DLG_SETTINGS = append(createElement("dialog"), append(createElement("div", {class: "vbox", style: "gap: 1em;"}),
        createElement("div", {class: "vbox", inner: '<span>Symbols:</span><input spellcheck="false" />'}),
        createElement("div", {class: "vbox", inner: '<div><span>Size:</span><output></output></div><input required type="range" min="4" max="48" />'}),
        createElement("div", {class: "vbox", inner: '<span>Extra:</span><input spellcheck="false" />'}),
        createElement("div", {class: "hbox large", inner: '<button>✔️</button><button>❌</button>', style: "gap: 0.5em; justify-content: right;"})
    ));
    append(TOP, DLG_SETTINGS);

    const [MENU_SETTINGS, MENU_COPY, MENU_FILL, MENU_QUIT] = querySelectorAll(MAIN, "button");

    const [NAME, KEY, CONFIRM, PASSWORD] = querySelectorAll(MAIN, "input");

    const [SETTINGS_SYMBOLS, SETTINGS_SIZE, SETTINGS_EXTRA] = querySelectorAll(DLG_SETTINGS, "input");
    const [SETTINGS_OK, SETTINGS_CANCEL] = querySelectorAll(DLG_SETTINGS, "button");

    PASSWORD.readOnly = true;
    PASSWORD.style.fontWeight = "bold";

    if (DOTS) {
        KEY.type = "password";
        CONFIRM.type = "password";
    } else {
        CONFIRM.style.display = "none";
    }
    if (HOST) NAME.value = window.location.host;

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

    const fill = () => {
        PWDS.forEach(p => {p.value = PASSWORD.value;});
    };

    const update = () => {
        const ok = (length(NAME.value) > 0) && (length(KEY.value) > 0) && (!DOTS || (KEY.value == CONFIRM.value));
        if (ok) {
            MENU_COPY.disabled = MENU_FILL.disabled = false;
            hash().then(h => {PASSWORD.value = h;});
        } else {
            MENU_COPY.disabled = MENU_FILL.disabled = true;
            PASSWORD.value = "";
        }
    };
    
    const settings = () => {
        // SETTINGS_SIZE.title = SETTINGS_SIZE.value;
        querySelectorAll(DLG_SETTINGS, "output")[0].textContent = SETTINGS_SIZE.value;
        SETTINGS_OK.disabled = !SETTINGS_SYMBOLS.reportValidity();
    };

    [NAME, KEY, CONFIRM].forEach(i => {addListener(i, "keyup", update);});

    addListener(MENU_COPY, "click", () => {navigator.clipboard.writeText(PASSWORD.value);});
 
    if (FILL) addListener(MENU_FILL, "click", fill);

    addListener(MENU_SETTINGS, "click", () => {
        SETTINGS_SYMBOLS.value = SETTINGS.SYMBOLS.replaceAll(" ", "");
        SETTINGS_SIZE.value = SETTINGS.SIZE.toString();
        SETTINGS_EXTRA.value = SETTINGS.EXTRA.trim();
        settings();
        DLG_SETTINGS.showModal();
    });

    addListener(TOP, "cancel", close);

    addListener(MENU_QUIT, "click", close);

    addListener(SETTINGS_SYMBOLS, "keyup", settings);

    addListener(SETTINGS_SIZE, "input", settings);

    addListener(SETTINGS_OK, "click", () => {
        SETTINGS.SYMBOLS = SETTINGS_SYMBOLS.value;
        SETTINGS.SIZE = parseInt(SETTINGS_SIZE.value);
        SETTINGS.EXTRA = SETTINGS_EXTRA.value;
        DLG_SETTINGS.close();
        update();
    });
    addListener(SETTINGS_CANCEL, "click", () => DLG_SETTINGS.close());

    update();
    TOP.showModal();

    //
    // check if crypto is available, disable everything otherwise.
    //

    if (!crypto.subtle) {
        [MENU_COPY, MENU_SETTINGS].forEach(e => e.disabled = true);
        for (const e of querySelectorAll(TOP, "input")) {
            e.disabled = true;
        }
        PASSWORD.value = "Insecure context";
        PASSWORD.style.color = "red";
    }
})();
