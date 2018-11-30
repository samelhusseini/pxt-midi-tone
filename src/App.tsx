/// <reference path="./midi-tone.d.ts" />
/// <reference path="./midi-convert.d.ts" />

import * as React from 'react';
import { Menu, Dropdown, Modal, Button } from 'semantic-ui-react'

import { FileDrop } from './components/FileDrop';
import { Tracks } from './components/Tracks';

import { AbstractEmitter } from './exporter/abstract';
import { MixerEmitter } from './exporter/mixer';
import { MicrobitEmitter } from './exporter/microbit';
import { AdafruitEmitter } from './exporter/adafruit';

import { parseTracks } from "./parser";
import { Player } from "./player";

export interface AppState {
    target?: string;
    hideTarget?: boolean;
    hasFileSupport?: boolean;
    partsData?: MidiData;
    extensionId?: string;
    songs?: Song[];
    selectedTrack?: number;
    isImporting?: boolean;
}

declare let MidiConvert: any;
declare let window: any;

export class App extends React.Component<{}, AppState> {

    private player: Player;

    constructor(props: {}) {
        super(props);

        this.state = {
            target: this.getDefaultTarget(),
            hasFileSupport: this.isSupported(),
            extensionId: this.isIFrame() ? window.location.hash.substr(1) : undefined,
            hideTarget: this.isIFrame(),
            songs: []
        }

        if (this.isIFrame()) {
            window.parent.postMessage({
                id: Math.random().toString(),
                type: "pxtpkgext",
                action: "extreadcode",
                extId: this.state.extensionId,
                response: true
            }, "*");
        };

        this.parseFile = this.parseFile.bind(this);
        this.onTargetChange = this.onTargetChange.bind(this);
        this.export = this.export.bind(this);

        this.beginImport = this.beginImport.bind(this);
        this.handleTrackClick = this.handleTrackClick.bind(this);
    }

    isSupported() {
        return window.File && window.FileReader && window.FileList && window.Blob
    }

    getDefaultTarget() {
        if (!this.isIFrame()) {
            const url = new URL(window.location.href);
            let chosen = url.searchParams.get("target");
            if (chosen) return chosen.toLowerCase();
            return "microbit"
        }
        return undefined;
    }

    isIFrame() {
        try {
            return window && window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    onTargetChange(e: any, { value }: any) {
        this.setState({ target: value });
    }

    componentDidMount() {
        window.addEventListener("message", (ev: any) => {
            var resp = ev.data;
            if (!resp) return;

            if (resp.type === "pxtpkgext")
                this.receivedResponse(resp);
        }, false);
    }

    // handle the response
    receivedResponse = (resp: any) => {
        console.log(resp);
        const target = resp.target;
        switch (resp.event) {
            case "extloaded": {
                // Loaded, set the target
                this.setState({ target });
                break;
            }
            case "extwritecode": break;
            // case "extreadcode": {
            default: { // TODO: the docs for this are a bit off, and no way to identify this type beyond id is returned
                // Loaded songs
                this.setState({ songs: JSON.parse(resp.resp.json) });
            }
        }
    }

    parseFile(file: File) {
        let reader = new FileReader();
        reader.onload = (e: any) => {
            const data = MidiConvert.parse(e.target.result) as MidiData;
            const songs = this.state.songs;

            // Parse the tracks
            const parsed: Track[] = parseTracks(data);

            // Rename any conflicting IDs
            const title = file.name.split('.')[0]; // trim extension
            const id = title.replace(/[^a-z]/gi, "");
            let renameCount = 1;
            while (songs.some(song => id + (renameCount == 1 ? "" : renameCount) == song.id)) {
                renameCount++;
            }
            const suffix = renameCount == 1 ? "" : renameCount;
            songs.push({
                id: id + suffix,
                title: title + suffix,
                tracks: parsed
            });

            this.setState({ partsData: data });
        };
        reader.readAsBinaryString(file);

        this.setState({ isImporting: false });

        this.export();
    }

    export() {
        const { target, partsData: data, extensionId, songs } = this.state;

        if (target == "json") {
            return JSON.stringify(data, undefined, 2);
        }

        let emitter: AbstractEmitter;
        switch (target) {
            case "arcade": {
                emitter = new MixerEmitter();
                break;
            }
            case "adafruit": {
                emitter = new AdafruitEmitter();
                break;
            }
            case "microbit": {
                emitter = new MicrobitEmitter();
            }
        }

        const output = emitter.output(songs);

        window.parent.postMessage({
            id: Math.random().toString(),
            type: "pxtpkgext",
            action: "extwritecode",
            extId: extensionId,
            body: {
                code: output,
                json: JSON.stringify(songs)
            }
        }, "*");

        console.log(output);
    }

    beginImport() {
        this.setState({ isImporting: true });
    }

    private midiPart: any;

    handleTrackClick(index: number) {
        if (this.player) this.player.dispose();

        if (this.state.selectedTrack == index) index = undefined;
        this.setState({ selectedTrack: index });

        if (!index) return;

        this.player = new Player(this.state.partsData);
        this.player.play(index);
    }

    render() {
        const { target, hideTarget, partsData, selectedTrack, hasFileSupport } = this.state;

        const targetOptions = [{
            text: 'micro:bit',
            value: 'microbit'
        }, {
            text: 'Adafruit',
            value: 'adafruit'
        }, {
            text: 'Arcade',
            value: 'arcade'
        }, {
            text: 'JSON',
            value: 'json'
        }]

        return (
            <div className={`App ${!target ? 'dimmable dimmed' : ''}`}>
                {!hasFileSupport ?
                    <div>Reading files not supported by this browser</div> :
                    <div className="ui text container">
                        {partsData ?
                            <div>
                                <Menu fixed="top">
                                    <Menu.Item>
                                        <Button onClick={this.beginImport}>Import</Button>
                                    </Menu.Item>
                                    {!hideTarget ? <Menu.Item name='targetselector'>
                                        <Dropdown placeholder='Target' fluid selection defaultValue={target} options={targetOptions} onChange={this.onTargetChange} />
                                    </Menu.Item> : undefined}
                                    <Menu.Menu position="right">

                                    </Menu.Menu>
                                </Menu>
                                <Tracks data={partsData} selectedTrack={selectedTrack} handleTrackClick={this.handleTrackClick} />
                            </div> :
                            <FileDrop parseFile={this.parseFile} />}
                    </div>
                }
                <Modal open={this.state.isImporting}>
                    <Modal.Content style={{ height: '300px' }}>
                        <FileDrop parseFile={this.parseFile} />
                    </Modal.Content>
                </Modal>
            </div>
        );
    }
}