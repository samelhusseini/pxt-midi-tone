
import { PXTClient } from './pxtclient';

export namespace pxt.extensions {

    export function inIframe() {
        try {
            return window && window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    export function setup(client: PXTClient) {
        window.addEventListener("message", (ev: any) => {
            let resp = ev.data;
            if (!resp) return;

            if (resp.type === "pxtpkgext")
                handleMessage(client, resp);
        }, false);
    }

    function handleMessage(client: PXTClient, msg: any) {
        if (!msg.id) {
            const target = msg.target;
            switch (msg.event) {
                case "extinit":
                    // Loaded, set the target
                    client.emit('init', msg.target);
                    break;
                case "extloaded":
                    // Loaded, set the target
                    client.emit('loaded', target);
                    break;
                case "extshown":
                    client.emit('shown', target);
                    break;
                case "exthidden":
                    client.emit('hidden', target);
                    break;
                default:
                    console.log("Unhandled event", msg);
            }
            console.log(msg);
            return;
        }
        const action = idToType[msg.id];
        console.log(action, msg);

        switch (action) {
            case "extinit":
                // Loaded, set the target
                client.emit('init', msg.resp);
                break;
            case "extusercode":
                // Loaded, set the target
                client.emit('readuser', msg.resp);
                break;
            case "extreadcode":
                // Loaded, set the target
                client.emit('read', msg.resp);
                break;
            case "extwritecode":
                // Loaded, set the target
                client.emit('written', msg.resp);
                break;
        }
    }

    export function init() {
        console.log("initializing");
        if (!inIframe()) return;

        const msg = mkRequest('extinit');
        window.parent.postMessage(msg, "*");
    }

    export function read() {
        console.log('requesting read code');
        if (!inIframe()) return;

        const msg = mkRequest('extreadcode');
        window.parent.postMessage(msg, "*");
    }

    export function readUser() {
        console.log('requesting read user code');
        if (!inIframe()) return;

        const msg = mkRequest('extusercode');
        window.parent.postMessage(msg, "*");
    }

    export function write(code: string, json?: string) {
        console.log('writing code:', code, json);
        if (!inIframe()) return;

        const msg: any = mkRequest('extwritecode');
        msg.body = {
            code: code,
            json: json
        }
        window.parent.postMessage(msg, "*");
    }

    export function queryPermission() {
        if (!inIframe()) return;

        const msg: any = mkRequest('extquerypermission');
        window.parent.postMessage(msg, "*");
    }

    export function requestPermission(serial: boolean) {
        if (!inIframe()) return;

        const msg: any = mkRequest('extrequestpermission');
        msg.body = {
            serial: serial
        }
        window.parent.postMessage(msg, "*");
    }

    export function dataStream(serial: boolean) {
        if (!inIframe()) return;

        const msg: any = mkRequest('extdatastream');
        msg.body = {
            serial: serial
        }
        window.parent.postMessage(msg, "*");
    }

    let idToType: { [key: string]: string } = {};
    function mkRequest(action: string) {
        let id = Math.random().toString();
        idToType[id] = action;
        return {
            type: "pxtpkgext",
            action: action,
            extId: getExtensionId(),
            response: true,
            id: id
        }
    }

    export function getExtensionId() {
        return inIframe() ? window.location.hash.substr(1) : undefined;
    }
}