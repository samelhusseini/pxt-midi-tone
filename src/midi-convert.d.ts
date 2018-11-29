
interface MidiData {
    // the transport and timing data
    header: {
        name: string,                     // the name of the first empty track, 
        // which is usually the song name
        bpm: number,                      // the tempo, e.g. 120
        timeSignature: [number, number],  // the time signature, e.g. [4, 4],
        PPQ: number                       // the Pulses Per Quarter of the midi file
    },

    startTime: number,                  // the time before the first note plays
    duration: number,                   // the time until the last note finishes

    // an array of midi tracks
    tracks: MidiTrack[]
}

interface MidiTrack {
    id: number,                     // the position of this track in the array
    name: string,                   // the track name if one was given
    notes: MidiNote[],

    startTime: number,              // the time before the first note plays
    duration: number,               // the time until the last note finishes

    // midi control changes
    controlChanges: {
        // if there are control changes in the midi file
        '91': [
            {
                number: number,           // the cc number
                time: number,             // time in seconds
                value: number,            // normalized 0-1
            }
        ],
    },

    isPercussion: boolean,          // true if this track is on a percussion
    // channel
    channelnumber: number,          // the ID for this channel; 9 and 10 are
    // reserved for percussion

    instrumentnumber: number,       // the ID for this instrument, as defined
    // by the MIDI spec
    instrumentFamily: string,       // the name of this instrument's family,
    // as defined by the MIDI spec
    instrument: string,             // the instrument name, as defined by the
    // MIDI spec
}

interface MidiNote {
    midi: number,               // midi number, e.g. 60
    time: number,               // time in seconds
    name: string,               // note name, e.g. "C4"
    velocity: number,           // normalized 0-1 velocity
    duration: number,           // duration between noteOn and noteOff
}