
/* Internal, parsed representation of a Song */

interface Track {
    notes: string[];
    instrument: string;
}

interface Song {
    id: string;
    title: string;
    tracks: Track[];
}

interface MCEmitter {
    output: (songs: Song[]) => string;
}