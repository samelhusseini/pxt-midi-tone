
/* Internal, parsed representation of a Song */

declare interface Track {
    notes: string[];
    instrument: string;
}

declare interface Song {
    id: string;
    title: string;
    data: MidiData;
}

declare interface MCEmitter {
    output: (songs: Song[]) => string;
}