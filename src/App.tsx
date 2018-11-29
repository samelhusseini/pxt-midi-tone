
import * as React from 'react';
import { Menu, Dropdown } from 'semantic-ui-react'

import { FileDrop } from './components/FileDrop';

export interface AppState {
    target?: string;
    hideTarget?: boolean;
    hasFileSupport?: boolean;
    partsData?: any;
    extensionId?: string;
    songs?: Song[];
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
            target: this.getDefaultTarget(),
            hasFileSupport: this.isSupported(),
            extensionId: this.isIFrame() ? window.location.hash.substr(1) : undefined,
            hideTarget: this.isIFrame(),
            songs: []
        }

        if (this.isIFrame()) {
            window.parent.postMessage({
                id:  Math.random().toString(),
                type: "pxtpkgext",
                action: "extreadcode",
                extId: this.state.extensionId,
                response: true
            }, "*");
        };

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
            const data = MidiConvert.parse(e.target.result);
            const songs = this.state.songs;

            let tracks: Track[] = data.tracks;
            let bpm = data.header.bpm;
            let beat = (60 / bpm) / 4; // in ms
            let totalDuration = data.duration;

            // Parse the tracks
            let parsed: Track[] = [];
            for (let t = 0; t < tracks.length; t++) {
                let track = this.parseTrack(tracks[t], bpm, beat, totalDuration);
                if (!(track.notes.length == 1 && track.notes[0].charAt(0) == "R")) parsed.push(track);
            }
            
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
    }

    getResults() {
        const { target, partsData: data, extensionId, songs } = this.state;

        if (target == "json") {
            return JSON.stringify(data, undefined, 2);
        }
        
        let output = "";
        switch (target) {
            case "arcade": {
                output = this.outputMixer(songs);
                break;
            }
            case "adafruit": {
                output = this.outputAdafruit(songs);
                break;
            }
            case "microbit": {
                output = this.outputMicrobit(songs);
            }
        }

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

        return output;
    }

    outputMixer(songs: Song[]) {
        return `// Auto-generated. Do not edit.
enum SongList {
    ${ songs.map(song => `//% block="${ song.title }"
    ${ song.id },`).join("\n    ") }
}

namespace music {
    class Song {
        tracks: Melody[];

        constructor(tracks: Melody[]) {
            this.tracks = tracks;
        }

        play() {
            this.tracks.forEach(t => t.play());
        }

        playTrack(track: number) {
            if (track >= 0 && track < this.tracks.length)
                this.tracks[track].play();
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
    //% blockId="miditoneplaysong" block="play midi song %id"
    export function playSong(id: SongList) {
        if (songs[id]) songs[id].play();
    }

    /**
     * Play the given track of the given song
     */
    //% weight=99
    //% blockId="miditoneplaysongtrack" block="play midi song %id track number %track"
    export function playSongTrack(id: SongList, track: number) {
        if (songs[id]) songs[id].playTrack(track);
    }

    /**
     * Stops the given song
     */
    //% weight=95
    //% blockId="miditonestopsong" block="stop midi song %id"
    export function stopSong(id: SongList) {
        if (songs[id]) songs[id].stop();
    }
${ songs.map(song => `
    songs[SongList.${ song.id }] = new Song([
        ${ song.tracks.map(track => `new Melody('${ track.notes.join(" ") }'),`).join("\n        ") }
    ]);`).join("\n")}
}
// Auto-generated. Do not edit. Really.
`
    }

    outputAdafruit(songs: Song[]) {
        return `// Auto-generated. Do not edit.
enum SongList {
    ${ songs.map(song => `//% block="${ song.title }"
    ${ song.id },`).join("\n    ") }
}

namespace music {
    class Song {
        tracks: string[];
        private main: number;

        constructor(tracks: string[]) {
            this.tracks = tracks;
            this.main = 0;
            for (let i = 0; i < this.tracks.length; i++) {
                if (this.tracks[this.main].length < this.tracks[i].length) {
                    this.main = i;
                }
            }
        }

        play() {
            this.playTrack(this.main);
        }

        playTrack(index: number) {
            if (index >= 0 && index < this.tracks.length)
                music.playSoundUntilDone(this.tracks[index]);
        }
    }

    let songs: Song[] = [];

    /**
     * Play the given song
     */
    //% weight=100
    //% blockId="miditoneplaysong" block="play midi song %id"
    export function playSong(id: SongList) {
        if (songs[id]) songs[id].play();
    }

    /**
     * Play the given track of the given song
     */
    //% weight=99
    //% blockId="miditoneplaysongtrack" block="play midi song %id track number %track"
    export function playSongTrack(id: SongList, track: number) {
        if (songs[id]) songs[id].playTrack(track);
    }

${ songs.map(song => `
    songs[SongList.${ song.id }] = new Song([
        ${ song.tracks.map(track => `'${ track.notes.join(" ") }',`).join("\n        ") }
    ]);`).join("\n")}
}
// Auto-generated. Do not edit. Really.
`
    }

    outputMicrobit(songs: Song[]) {
        return `// Auto-generated. Do not edit.
enum SongList {
    ${ songs.map(song => `//% block="${ song.title }"
    ${ song.id },`).join("\n    ") }
}

namespace music {
    class Song {
        tracks: string[][];
        private main: number;

        constructor(tracks: string[][]) {
            this.tracks = tracks;
            this.main = 0;
            for (let i = 0; i < this.tracks.length; i++) {
                if (this.tracks[this.main].length < this.tracks[i].length) {
                    this.main = i;
                }
            }
        }

        play() {
            this.playTrack(this.main);
        }

        playTrack(index: number) {
            if (index >= 0 && index < this.tracks.length)
                music.beginMelody(this.tracks[index]);
        }
    }

    let songs: Song[] = [];

    /**
     * Play the given song
     */
    //% weight=100
    //% blockId="miditoneplaysong" block="play midi song %id"
    export function playSong(id: SongList) {
        if (songs[id]) songs[id].play();
    }

    /**
     * Play the given track of the given song
     */
    //% weight=99
    //% blockId="miditoneplaysongtrack" block="play midi song %id track number %track"
    export function playSongTrack(id: SongList, track: number) {
        if (songs[id]) songs[id].playTrack(track);
    }

${ songs.map(song => `
    songs[SongList.${ song.id }] = new Song([
        ${ song.tracks.map(track => `['${ track.notes.join("', '") }'],`).join("\n        ") }
    ]);`).join("\n")}
}
// Auto-generated. Do not edit. Really.
`
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
            <div className={`App ${!target ? 'dimmable dimmed' : ''}`}>
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