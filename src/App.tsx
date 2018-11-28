
import * as React from 'react';
import { Menu, Dropdown } from 'semantic-ui-react'

import { FileDrop } from './components/FileDrop';

export interface AppState {
    target?: string;
    hideTarget?: boolean;
    hasFileSupport?: boolean;
    partsData?: any;
    extensionId?: string;
}

interface Track {
    notes: string[];
    instrument: string;
}

interface Song {
    id: string;
    title: string;
    tracks: Track[];
}

declare let MidiConvert: any;
declare let window: any;

export class App extends React.Component<{}, AppState> {

    constructor(props: {}) {
        super(props);

        this.state = {
            target: this.getDefaultTarget() || "microbit",
            hasFileSupport: this.isSupported(),
            extensionId: this.isIFrame() ? window.location.hash.substr(1) : undefined,
            hideTarget: this.isIFrame()
        }

        this.parseFile = this.parseFile.bind(this);
        this.onTargetChange = this.onTargetChange.bind(this);
        this.getResults = this.getResults.bind(this);
    }

    isSupported() {
        return window.File && window.FileReader && window.FileList && window.Blob
    }

    getDefaultTarget() {
        if (!this.isIFrame()) {
            const url = new URL(window.location.href);
            let chosen = url.searchParams.get("target");
            if (chosen) return chosen.toLowerCase();
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

    }

    parseFile(file: any) {
        //read the file
        let reader = new FileReader();
        reader.onload = (e: any) => {
            var partsData = MidiConvert.parse(e.target.result);
            this.setState({ partsData });
        };
        reader.readAsBinaryString(file);
    }

    getResults() {
        const { target, partsData: data, extensionId } = this.state;

        let tracks: Track[] = data.tracks;
        let bpm = data.header.bpm;
        let beat = (60 / bpm) / 4; // in ms
        let totalDuration = data.duration;

        let parsed: Track[] = [];
        for (let t = 0; t < tracks.length; t++) {
            let track = this.parseTrack(tracks[t], bpm, beat, totalDuration);
            if (!(track.notes.length == 1 && track.notes[0].charAt(0) == "R")) parsed.push(track);
        }

        let output: string;

        if (target == "arcade") {
            output = `let tracks = [
    `;
        } else if (target == "json") {
            output = JSON.stringify(data, undefined, 2);
            return output;
        } else {
            output = "";
        }

        parsed.forEach(track => {
            switch (target) {
                case "microbit": {
                    output += "// Instrument: " + track.instrument + "\n";
                    output += "music.beginMelody(['" + track.notes.join("', '") + "']);\n";
                    break;
                }
                case "adafruit": {
                    output += "// Instrument: " + track.instrument + "\n";
                    output += "music.playSoundUntilDone('" + track.notes.join(" ") + "');\n";
                    break;
                }
                case "arcade": {
                    output += "    new music.Melody('" + track.notes.join(" ") + "'),\n"
                }
            }
        });

        if (target == "arcade") {
            output += `];

function runMusic() {
    tracks.forEach(t => t.playUntilDone());
}

runMusic();`;
            this.outputMixer(parsed, extensionId);
        }

        return output;
    }

    outputMixer(tracks: Track[], extensionId: string) {
        let output = `
// automatically generated; do not edit
enum SongList {
    //% block="ExampleSong"
    EXAMPLESONG,
}

namespace music {
    class Song {
        tracks: Melody[];

        constructor(tracks: Melody[]) {
            this.tracks = tracks;
        }

        play() {
            this.tracks.forEach(t => t.playUntilDone());
        }

        stop() {
            this.tracks.forEach(t => t.stop());
        }
    }

    let songs: Song[] = [];

    /**
     * Play the given song
     */
    //% weight=100
    //% blockId="miditoneplaysong" block="play song %id"
    export function playSong(id: SongList) {
        if (songs[id]) songs[id].play();
    }

    /**
     * Stops the given song
     */
    //% weight=99
    //% blockId="miditonestopsong" block="stop song %id"
    export function stopSong(id: SongList) {
        if (songs[id]) songs[id].stop();
    }

    songs[SongList.EXAMPLESONG] = new Song([
        ${ tracks.map(track => `new Melody('${ track.notes.join(" ") }'),`).join("\n")}
    ]);
}
`
        window.parent.postMessage({
            id: Math.random().toString(),
            type: "pxtpkgext",
            action: "extwritecode",
            extId: extensionId,
            body: {
                code: output,
                json: JSON.stringify(tracks)
            }
        }, "*");
        return output;
    }

    parseTrack(track: any, bpm: number, beat: number, totalDuration: number): Track {
        var notes = track.notes;
        // Resolve conflicts
        // If they overlap in time, the highest one wins
        // We'll need time and duration for that one.

        // The minimum time chunk is 1 beat, which is 0.125 seconds
        // Go through and allocate a note for each beat, or a rest and then we'll go through and join them

        let notesPerBeat: any = [];
        let x = 0;
        let i = 0;
        while (x < totalDuration) {
            notesPerBeat[i] = 0;
            x += beat;
            i++;
        }

        for (let i = 0; i < notes.length; i++) {
            var note = notes[i];
            // Go through and allocate the note to each beat

            var startBeat = Math.ceil(note.time / beat);
            // Use velocity to figure out how long to play the note for.
            var endBeat = Math.ceil((note.time + note.duration) / beat);

            while (startBeat < endBeat) {
                if (notesPerBeat[startBeat]) {
                    var prevMidi = notesPerBeat[startBeat][1];
                    if (prevMidi < note.midi) {
                        notesPerBeat[startBeat] = [note.name, note.midi];
                    }
                } else {
                    notesPerBeat[startBeat] = [note.name, note.midi];
                }
                startBeat++;
            }
        }

        // Now that we've dealt with conflicts, let's go through and join things together, adding rests.

        let retArray = [];

        let currentNote;
        let currentDuration = 0;

        for (let i = 0; i < notesPerBeat.length; i++) {
            let note = notesPerBeat[i] ? notesPerBeat[i][0] : 'R';
            if (!currentNote) {
                currentNote = note;
            } else {
                if (currentNote == note) {
                    currentDuration++;
                } else {
                    // Switching notes, commit the current one and update
                    retArray.push(currentNote + ":" + (currentDuration));
                    currentNote = note;
                    currentDuration = 0;
                }
            }
        }

        if (currentDuration) {
            retArray.push(currentNote + ":" + currentDuration);
        }

        return {
            notes: retArray,
            instrument: track.instrument
        }
    }


    render() {
        const { target, hideTarget, partsData, hasFileSupport } = this.state;

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
                {!hasFileSupport ?
                    <div>Reading files not supported by this browser</div> :
                    <div className="ui text container">
                        {partsData ?
                            <div>
                                <Menu fixed="top">
                                    {!hideTarget ? <Menu.Item name='targetselector'>
                                        <Dropdown placeholder='Target' fluid selection defaultValue={target} options={targetOptions} onChange={this.onTargetChange} />
                                    </Menu.Item> : undefined}
                                </Menu>
                                <div id="Results">
                                    <textarea id="ResultsText" value={this.getResults()}></textarea>
                                </div>
                            </div> :
                            <FileDrop parseFile={this.parseFile} />}
                    </div>
                }
            </div>
        );
    }
}