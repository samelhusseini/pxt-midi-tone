export namespace pxt.extensions {

    export function inIframe() {
        try {
            return window && window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    export function read() {

    }

    export function setup(callback: (resp: any) => void) {
        window.addEventListener("message", (ev: any) => {
            var resp = ev.data;
            if (!resp) return;

            if (resp.type === "pxtpkgext")
                callback(resp);
        }, false);
    }

    export function requestRead() {
        if (!inIframe()) return;

        window.parent.postMessage({
            id: Math.random().toString(),
            type: "pxtpkgext",
            action: "extreadcode",
            extId: pxt.extensions.getExtensionId(),
            response: true
        }, "*");
    }

    export function write(code: string, json?: string) {
        if (!inIframe()) return;

        window.parent.postMessage({
            id: Math.random().toString(),
            type: "pxtpkgext",
            action: "extwritecode",
            extId: getExtensionId(),
            body: {
                code: code,
                json: json
            }
        }, "*");
    }

    export function getExtensionId() {
        return inIframe() ? window.location.hash.substr(1) : undefined;
    }
}