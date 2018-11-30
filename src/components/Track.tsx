import * as React from 'react';
import { Segment } from 'semantic-ui-react';

import { Note } from './Note';

export interface TrackProps {
    track: any;
    index?: number;
    selected?: boolean;
    onClick?: (index: number) => void;
}

export class Track extends React.Component<TrackProps, {}> {

    constructor(props: TrackProps) {
        super(props);

        this.handleClick = this.handleClick.bind(this);
    }

    handleClick() {
        const { index, onClick } = this.props;
        if (onClick) onClick(index);
    }

    render() {
        const { track, index, selected } = this.props;
        let minMidi = 127;
        let maxMidi = 0;
        track.notes.forEach((note: any) => {
            if (note.midi < minMidi) minMidi = note.midi;
            if (note.midi > maxMidi) maxMidi = note.midi;
        });
        const height = 100;
        const scale = (127 / Math.max(30, maxMidi - minMidi)) * height / 127;
        const timeMultiplier = 40;
        const width = (track.duration * timeMultiplier) + timeMultiplier;
        return (<Segment className={`${selected ? 'selected' : ''}`} style={{ width: `${width}px` }} onClick={this.handleClick}>
            <div className="name">{track.instrument || track.name}</div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`}>
                <g transform={`translate(0 -${(127 - maxMidi) * scale}) scale(1 ${scale})`}>
                    {track.notes.map((note: any, nIndex: number) =>
                        <Note key={`note${index}_${nIndex}`} note={note} />
                    )}
                </g>
            </svg>
        </Segment>);
    }
}