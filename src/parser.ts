
export function parseTracks(data: MidiData): Track[] {

    const tracks: MidiTrack[] = data.tracks;
    const bpm = data.header.bpm;
    const beat = (60 / bpm) / 4; // in ms
    const totalDuration = data.duration;

    const parsed: Track[] = [];
    for (let t = 0; t < tracks.length; t++) {
        let track = this.parseTrack(tracks[t], bpm, beat, totalDuration);
        if (!(track.notes.length == 1 && track.notes[0].charAt(0) == "R")) parsed.push(track);
    }

    return parsed;
}

export function parseTrack(track: MidiTrack, bpm: number, beat: number, totalDuration: number): Track {
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
