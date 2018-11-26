namespace music {

    export interface Track {
        playTrack: () => void;
        stopTrack?: () => void;
    }
}