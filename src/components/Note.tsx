import * as React from 'react';

export interface NoteProps {
    note: any;
}

export class Note extends React.Component<NoteProps, {}> {

    constructor(props: NoteProps) {
        super(props);
    }

    render() {
        const { note } = this.props;

        const timeMultiplier = 40;
        const { name, midi, time, velocity, duration } = note;

        const width = Math.floor(duration * timeMultiplier);
        const left = Math.floor(((time * timeMultiplier)));
        const top = Math.floor((127 - midi));

        const styles: React.CSSProperties = {
            // position: 'absolute',
            // left: `${left}px`,
            // top: `${top}px`,
            //width: `${width}px`,
            //height: `2px`
        }
        return (
            <rect className="note" width={width} height={2} transform={`translate(${left} ${top})`} style={styles}>
            </rect>
        );
    }
}