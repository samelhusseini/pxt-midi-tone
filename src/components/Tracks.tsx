import * as React from 'react';

import { Track } from './Track';

export interface TracksProps {
    data: any;
    selectedTrack?: number;
    handleTrackClick?: (index: number) => void;
}

export class Tracks extends React.Component<TracksProps, {}> {

    constructor(props: TracksProps) {
        super(props);

        this.handleTrackClick = this.handleTrackClick.bind(this);
    }

    handleTrackClick(index: number) {
        const { handleTrackClick } = this.props;
        if (handleTrackClick) handleTrackClick(index);
    }

    render() {
        const { data, selectedTrack } = this.props;
        return (
            <div id="Tracks">
                <div className="ui container fluid">
                    <div>
                        {data.tracks.map((track: any, index: number) => {
                            return track.notes.length > 0 ?
                                <Track key={`track${index}`} track={track} index={index} selected={selectedTrack == index} onClick={this.handleTrackClick} /> : undefined
                        })}
                    </div>
                </div>
            </div>
        );
    }
}