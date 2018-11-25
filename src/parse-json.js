window.onload = function() {
    if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
        document.querySelector("#FileDrop #Text").textContent = "Reading files not supported by this browser";
        return;
    }

    const fileDrop = document.querySelector("#FileDrop");
    const target = document.getElementById("TargetSelect");

    if (!isIFrame()) {
        const url = new URL(window.location.href);
        var chosen = url.searchParams.get("target");
        if (chosen) chosen = chosen.toUpperCase();

        for (let option of target.options) {
            const choice = option.value;
            if (choice.toUpperCase() == chosen) {
                target.value = choice;
            }
        }
    }
    
    fileDrop.addEventListener("dragenter", function () {
        fileDrop.classList.add("Hover");
    });

    fileDrop.addEventListener("dragleave", function () {
        fileDrop.classList.remove("Hover");
    });

    fileDrop.addEventListener("drop", function () {
        fileDrop.classList.remove("Hover");
    });

    document.querySelector("#FileDrop input").addEventListener("change", function (e) {
        //get the files
        var files = e.target.files;
        if (files.length > 0) {
            var file = files[0];
            document.querySelector("#FileDrop #Text").textContent = file.name;
            parseFile(file);
        }
    });

    document.getElementById("TargetSelect").addEventListener("change", function (e) {
        var files = document.querySelector("#FileDrop input").files;
        if (files.length > 0) {
            var file = files[0];
            document.querySelector("#FileDrop #Text").textContent = file.name;
            parseFile(file);
        }
    });
}

function parseFile(file) {
    //read the file
    var reader = new FileReader();
    reader.onload = function (e) {
        var partsData = MidiConvert.parse(e.target.result);
        convertToPXTMelody(partsData);
    };
    reader.readAsBinaryString(file);
}

function convertToPXTMelody(data) {
    var tracks = data.tracks;
    var bpm = data.header.bpm;
    var beat = (60 / bpm) / 4; // in ms
    var totalDuration = data.duration;

    // First let's find the main track
    var mainTrack;
    var maxDuration = -1;

    var target = document.getElementById("TargetSelect").value;
    // var mixer;

    var output = document.querySelector("#ResultsText");

    if (target == "arcade") {
        output.value =  `let tracks = [
`;
    } else if (target == "json") {
        output.value = JSON.stringify(data, undefined, 2);
        return;
    } else {
        output.value = "";
    }

    for (let t = 0; t < tracks.length; t++) {
        let track = parseTrack(tracks[t], bpm, beat, totalDuration);
        if (track.notes.length == 1 && track.notes[0].charAt(0) == "R") continue;

        switch (target) {
            case "microbit": {
                output.value += "Instrument: " + track.instrument + "\n";
                output.value += "music.beginMelody(['" + track.notes.join(["', '"]) + "']);\n";
                break;
            }
            case "adafruit": {
                output.value += "Instrument: " + track.instrument + "\n";
                output.value += "music.playSoundUntilDone('" + track.notes.join(" ") + "');\n";
                break;
            }
            case "arcade": {
                output.value += "\tnew music.Melody('" + track.notes.join(" ") + "'),\n"
            }
        }
    }
    if (target == "arcade") {
        output.value += `];

function runMusic() {
    tracks.forEach(t => t.playUntilDone());
}

runMusic();`;
    }
}

function parseTrack(track, bpm, beat, totalDuration) {
    var notes = track.notes; // mainTrack.notes;
    // Resolve conflicts
    // If they overlap in time, the highest one wins
    // We'll need time and duration for that one.

    // The minimum time chunk is 1 beat, which is 0.125 seconds
    // Go through and allocate a note for each beat, or a rest and then we'll go through and join them

    var notesPerBeat = [];
    var x = 0;
    var i = 0;
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

    var retArray = [];

    var currentNote;
    var currentDuration = 0;

    for (var i = 0; i < notesPerBeat.length; i++) {
        var note = notesPerBeat[i] ? notesPerBeat[i][0] : 'R';
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

// Everything is in 125 ms increments
// Assuming a beat

// 4 is a quarter note, which is equal to the beat in 4/4
// At 120 bpm it's 2 beats per second, 1 beat = 0.5 seconds
// Find out what 1 beat is

// The micro:bit only supports the following durations, find the closest for each note
function roundDuration(beat, duration) {
    var x = beat;
    var count = 1;
    while (x < duration) {
        x += beat;
        count++;
    }
    return count;
}

/**
 * Taken from https://github.com/Microsoft/pxt-neoanim/blob/76ab334622687e4a6b6d844f6804f682f7da671a/index.html#L76
 */
function isIFrame() {
    try {
        return window && window.self !== window.top;
    } catch (e) {
        return true;
    }
}