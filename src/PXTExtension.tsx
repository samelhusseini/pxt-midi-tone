/// <reference path="./lib/pxtextensions.ts" />

import * as React from 'react';
import { App } from './App';
import { pxt } from './lib/pxtextensions';

import { PXTClient } from './lib/pxtclient';

export interface PXTExtensionState {
    target?: string;
    isSupported?: boolean;
}

declare let window: any;

export class PXTExtension extends React.Component<{}, PXTExtensionState> {

    private client: PXTClient;

    constructor(props: {}) {
        super(props);

        this.state = {
            target: this.getDefaultTarget(),
            isSupported: this.isSupported()
        }

        this.client = new PXTClient();
    }

    private isSupported() {
        // Check for whether or not the extension is supported on this browser, return true if always supported
        return window.File && window.FileReader && window.FileList && window.Blob
    }

    private getDefaultTarget() {
        if (!this.isIFrame()) {
            const url = new URL(window.location.href);
            let chosen = url.searchParams.get("target");
            if (chosen) return chosen.toLowerCase();
            return "microbit"
        }
        return undefined;
    }

    private isIFrame() {
        try {
            return window && window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    componentDidMount() {
        if (!pxt.extensions.inIframe()) return;

        // Setup the handler
        pxt.extensions.setup(this.handlePXTResponse);

        // Read code
        pxt.extensions.requestRead();
    }

    handlePXTResponse = (resp: any) => {
        console.log(resp);
        const target = resp.target;
        switch (resp.event) {
            case "extloaded":
                // Loaded, set the target
                this.setState({ target })
                break;
            case "extwritecode": break;
            // case "extreadcode": {
            default: { // TODO: the docs for this are a bit off, and no way to identify this type beyond id is returned
                this.client.emit('read', resp.resp);
            }
        }
    }

    render() {
        const { target, isSupported } = this.state;

        return (
            <div className={`MCExtension ${!target ? 'dimmable dimmed' : ''}`}>
                {!isSupported ? <div>
                    This extension is not supported on your browser
                </div> : <App target={target} client={this.client} />}
            </div>
        );
    }
}