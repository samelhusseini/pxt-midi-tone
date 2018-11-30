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

import { Player } from "./helpers/player";
import { pxt } from './lib/pxtextensions';

import { PXTClient } from './lib/pxtclient';
import { Songs } from './components/Songs';

export interface AppProps {
    client: PXTClient;
    target?: string;
}

export interface AppState {
    target?: string;
    songs?: Song[];
    selectedSong?: number;
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
        this.handleSongClick = this.handleSongClick.bind(this);
        this.handleTrackClick = this.handleTrackClick.bind(this);
        this.handleReadResponse = this.handleReadResponse.bind(this);
        this.handleHidden = this.handleHidden.bind(this);
        this.getCurrentSong = this.getCurrentSong.bind(this);
        this.clearAll = this.clearAll.bind(this);

        props.client.on('read', this.handleReadResponse);
        props.client.on('hidden', this.handleHidden);
    }

    handleReadResponse(resp: ReadResponse) {
        if (resp && resp.json && resp.json != ' ') {
            this.setState({ songs: JSON.parse(resp.json), selectedSong: 0 });
        }
    }

    handleHidden() {
        const { songs } = this.state;
        if (songs && songs.length > 0) {
            this.export(songs);
        } else {
            pxt.extensions.write(' ', ' ');
        }
    }

    onTargetChange(e: any, { value }: any) {
        this.setState({ target: value });
    }

    componentWillReceiveProps(nextProps: AppProps) {
        this.setState({ target: nextProps.target });
    }

    componentDidUpdate(prevProps: AppProps, prevState: AppState) {
        if (prevState.target && prevState.target != this.state.target) {
            if (this.state.songs && this.state.songs.length > 0) {
                this.export(this.state.songs);
            }
        }
    }

    parseFile(file: File) {
        const { target } = this.state;

        let reader = new FileReader();
        reader.onload = (e: any) => {
            const data = MidiConvert.parse(e.target.result) as MidiData;
            const songs = this.state.songs;

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
                data: data
            });

            if (target == "json") {
                console.log(JSON.stringify(data, undefined, 2));
            }

            this.setState({ songs, selectedSong: songs.length - 1 });
        };

        reader.readAsBinaryString(file);
        this.setState({ isImporting: false });
    }

    export(songs: Song[]) {
        const { target } = this.state;

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
                break;
            }
            default:
                return;
        }
        const output = emitter.output(songs);

        // Write code
        pxt.extensions.write(output, JSON.stringify(songs, function (key, value) {
            // limit precision of floats
            if (typeof value === 'number') {
                return parseFloat(value.toFixed(2));
            }
            return value;
        }));
    }

    beginImport() {
        this.setState({ isImporting: true });
    }

    clearAll() {
        this.setState({ songs: [], selectedSong: undefined })
    }

    handleSongClick(index: number) {
        this.setState({ selectedSong: index, selectedTrack: undefined });
        if (this.player) this.player.dispose();
    }

    handleTrackClick(index: number) {
        if (this.player) this.player.dispose();

        if (this.state.selectedTrack == index) index = undefined;
        this.setState({ selectedTrack: index });

        if (!index) return;

        const currentSong = this.getCurrentSong();
        this.player = new Player(currentSong.data);
        this.player.play(index);
    }

    getCurrentSong() {
        const { songs, selectedSong } = this.state;

        const hasSelectedSong = selectedSong != undefined;
        return hasSelectedSong && songs.length > 0 ? songs[selectedSong] : undefined;
    }

    render() {
        const { target, songs, selectedSong, selectedTrack } = this.state;

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

        const currentSong = this.getCurrentSong();
        const currentSongData = currentSong ? currentSong.data : undefined;

        return (
            <div className="App">
                <div className="ui text container">
                    {currentSongData ?
                        <div>
                            <Menu fixed="top">
                                <Menu.Item>
                                    <Button primary onClick={this.beginImport}>Import</Button>
                                </Menu.Item>
                                {/* {!pxt.extensions.inIframe() ? <Menu.Item name='targetselector'>
                                    <Dropdown placeholder='Target' fluid selection defaultValue={target} options={targetOptions} onChange={this.onTargetChange} />
                                </Menu.Item> : undefined} */}
                                <Menu.Menu position="right">
                                    <Button className="item" onClick={this.clearAll}>Clear All</Button>
                                </Menu.Menu>
                            </Menu>
                            <Songs songs={songs} selectedSong={selectedSong} handleSelect={this.handleSongClick} />
                            <Tracks data={currentSongData} selectedTrack={selectedTrack} handleTrackClick={this.handleTrackClick} />
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