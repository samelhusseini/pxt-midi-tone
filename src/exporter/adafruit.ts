
import { AbstractEmitter } from "./abstract";

export class AdafruitEmitter extends AbstractEmitter {

    output(songs: Song[]) {
        return this.outputHeader(songs) + `
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
` + this.outputFunctions() + this.outputSongs(songs, track => `'${track.notes.join(" ")}',`);
    }
}