
declare let Tone: any;

export class Player {

    private midiPart: any;

    constructor(private data: MidiData) {
    }

    play(index: number) {
        // TODO: replace with our own bpm
        Tone.Transport.bpm.value = this.data.header.bpm;

        const synth = new Tone.PolySynth(2).toMaster()
        this.midiPart = new Tone.Part(function (time: any, note: any) {
            //use the events to play the synth
            synth.triggerAttackRelease(note.name, note.duration, time, note.velocity)

        }, this.data.tracks[index].notes).start();

        // start the transport to hear the events
        Tone.Transport.start()
    }

    stop() {
        Tone.Transport.stop()
    }

    dispose() {
        if (this.midiPart) {
            this.midiPart.stop();
            this.midiPart = undefined;
        }
    }
}