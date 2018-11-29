

export abstract class AbstractEmitter implements MCEmitter {

    protected outputHeader(songs: Song[]) {
        return `// Auto-generated. Do not edit.
enum SongList {
    ${ songs.map(song => `//% block="${song.title}"
    ${ song.id},`).join("\n    ")}
}

namespace music {
    class Song {`;
    }


    protected outputFunctions() {
        return `
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
    }`
    }

    protected outputSongs(songs: Song[], trackFormat: (t: Track) => string) {
        return `
    ${ songs.map(song => `
    songs[SongList.${ song.id}] = new Song([
        ${ song.tracks.map(trackFormat).join("\n        ")}
    ]);`).join("\n")}
}
// Auto-generated. Do not edit. Really.`
    }

    abstract output(songs: Song[]): string;
}