/// <reference path="./typings/midi-tone.d.ts" />
/// <reference path="./typings/midi-convert.d.ts" />
/// <reference path="./typings/pxt-extensions.d.ts" />

import * as React from 'react';
import { Menu, Dropdown, Modal, Button } from 'semantic-ui-react'

import { FileDrop } from './components/FileDrop';
import { Tracks } from './components/Tracks';

import { AbstractEmitter } from './exporter/abstract';
import { MixerEmitter } from './exporter/mixer';
import { MicrobitEmitter } from './exporter/microbit';
import { AdafruitEmitter } from './exporter/adafruit';

import { parseTracks } from "./helpers/parser";
import { Player } from "./helpers/player";
import { pxt } from './lib/pxtextensions';

import { PXTClient } from './lib/pxtclient';

export interface AppProps {
    client: PXTClient;
    target?: string;
}

export interface AppState {
    target?: string;
    partsData?: MidiData;
    songs?: Song[];
    selectedTrack?: number;
    isImporting?: boolean;
}

declare let MidiConvert: any;

export class App extends React.Component<AppProps, AppState> {

    private player: Player;

    constructor(props: AppProps) {
        super(props);

        this.state = {
            target: props.target,
            songs: []
        }

        this.parseFile = this.parseFile.bind(this);
        this.onTargetChange = this.onTargetChange.bind(this);
        this.export = this.export.bind(this);

        this.beginImport = this.beginImport.bind(this);
        this.handleTrackClick = this.handleTrackClick.bind(this);

        props.client.on('read', this.handleReadResponse);
    }

    handleReadResponse(resp: ReadResponse) {
        this.setState({ songs: JSON.parse(resp.json) });
    }

    onTargetChange(e: any, { value }: any) {
        this.setState({ target: value });
    }

    componentDidUpdate(prevProps: AppProps, prevState: AppState) {
        if (prevState.target != this.state.target) {
            this.export();
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
        const { target, partsData: data, songs } = this.state;

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

        // Write code
        pxt.extensions.write(output, JSON.stringify(songs))
        console.log(output);
    }

    beginImport() {
        this.setState({ isImporting: true });
    }

    handleTrackClick(index: number) {
        if (this.player) this.player.dispose();

        if (this.state.selectedTrack == index) index = undefined;
        this.setState({ selectedTrack: index });

        if (!index) return;

        this.player = new Player(this.state.partsData);
        this.player.play(index);
    }

    render() {
        const { target, partsData, selectedTrack } = this.state;

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
            <div className="App">
                <div className="ui text container">
                    {partsData ?
                        <div>
                            <Menu fixed="top">
                                <Menu.Item>
                                    <Button onClick={this.beginImport}>Import</Button>
                                </Menu.Item>
                                {!pxt.extensions.inIframe() ? <Menu.Item name='targetselector'>
                                    <Dropdown placeholder='Target' fluid selection defaultValue={target} options={targetOptions} onChange={this.onTargetChange} />
                                </Menu.Item> : undefined}
                                <Menu.Menu position="right">

                                </Menu.Menu>
                            </Menu>
                            <Tracks data={partsData} selectedTrack={selectedTrack} handleTrackClick={this.handleTrackClick} />
                        </div> :
                        <FileDrop parseFile={this.parseFile} />}
                </div>
                <Modal open={this.state.isImporting}>
                    <Modal.Content style={{ height: '300px' }}>
                        <FileDrop parseFile={this.parseFile} />
                    </Modal.Content>
                </Modal>
            </div>
        );
    }
}