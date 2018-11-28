
import * as React from 'react';

import { FileDrop } from './components/FileDrop';

export interface AppState {
    target?: string;
    hasFileSupport?: boolean;
    partsData?: any;
}

declare let MidiConvert: any;
declare let window: any;

export class App extends React.Component<{}, AppState> {

    constructor(props: {}) {
        super(props);

        this.state = {
            target: this.getDefaultTarget() || "microbit",
            hasFileSupport: this.isSupported()
        }

        this.parseFile = this.parseFile.bind(this);
        this.onTargetChange = this.onTargetChange.bind(this);
        this.getResults = this.getResults.bind(this);
    }

    isSupported() {
        if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
            return false;
        }
        return true;
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

    onTargetChange(e: any) {
        this.setState({ target: e.target.value });
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
        const { target, partsData: data } = this.state;

        let tracks = data.tracks;
        let bpm = data.header.bpm;
        let beat = (60 / bpm) / 4; // in ms
        let totalDuration = data.duration;

        let output;
        if (target == "arcade") {
            output = `let tracks = [
    `;
        } else if (target == "json") {
            output = JSON.stringify(data, undefined, 2);
            return output;
        } else {
            output = "";
        }

        for (let t = 0; t < tracks.length; t++) {
            let track = this.parseTrack(tracks[t], bpm, beat, totalDuration);
            if (track.notes.length == 1 && track.notes[0].charAt(0) == "R") continue;

            switch (target) {
                case "microbit": {
                    output += "//Instrument: " + track.instrument + "\n";
                    output += "music.beginMelody(['" + track.notes.join("', '") + "']);\n";
                    break;
                }
                case "adafruit": {
                    output += "//Instrument: " + track.instrument + "\n";
                    output += "music.playSoundUntilDone('" + track.notes.join(" ") + "');\n";
                    break;
                }
                case "arcade": {
                    output += "    new music.Melody('" + track.notes.join(" ") + "'),\n"
                }
            }
        }
        if (target == "arcade") {
            output += `];

function runMusic() {
    tracks.forEach(t => t.playUntilDone());
}

runMusic();`;
        }

        return output;
    }

    parseTrack(track: any, bpm: number, beat: number, totalDuration: number) {
        var notes = track.notes; // mainTrack.notes;
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
        const { target, partsData, hasFileSupport } = this.state;

        return (
            <div className="App">
                {!hasFileSupport ?
                    <div>Reading files not supported by this browser</div> :
                    <div>
                        <div className="App-header">
                            <h2>Parse a MIDI file into a MakeCode-friendly JSON format.</h2>
                        </div>

                        <div id="Target">
                            <select id="TargetSelect" onChange={this.onTargetChange}>
                                <option value="microbit" selected={target == "microbit"}>MicroBit</option>
                                <option value="adafruit" selected={target == "adafruit"}>Adafruit</option>
                                <option value="arcade" selected={target == "arcade"}>Arcade</option>
                                <option value="json" selected={target == "json"}>JSON</option>
                            </select>
                        </div>

                        <FileDrop parseFile={this.parseFile} />

                        {partsData ?
                            <div id="Results">
                                <textarea id="ResultsText" value={this.getResults()}></textarea>
                            </div>
                            : undefined}
                    </div>
                }
            </div>
        );
    }
}