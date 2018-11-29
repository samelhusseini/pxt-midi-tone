
import { AbstractEmitter } from "./abstract";

export class MixerEmitter extends AbstractEmitter {

    output(songs: Song[]) {
        return this.outputHeader(songs) + `
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
` + this.outputFunctions() + `

    /**
    * Stops the given song
    */
    //% weight=95
    //% blockId="miditonestopsong" block="stop midi song %id"
    export function stopSong(id: SongList) {
        if (songs[id]) songs[id].stop();
    }` + this.outputSongs(songs, track => `new Melody('${track.notes.join(" ")}'),`);
    }
}