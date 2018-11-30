import * as React from 'react';
import { Menu } from 'semantic-ui-react';

import { SongCard } from './SongCard';

export interface SongsProps {
    songs?: Song[];
    selectedSong?: number;
    handleSelect?: (index: number) => void;
}

export class Songs extends React.Component<SongsProps, {}> {

    constructor(props: SongsProps) {
        super(props);

        this.handleSelect = this.handleSelect.bind(this);
    }

    handleSelect(index: number) {
        const { handleSelect } = this.props;
        if (handleSelect) handleSelect(index);
    }

    render() {
        const { songs, selectedSong } = this.props;
        return (
            <div id="Songs">
                <Menu pointing>
                    {songs.map((song: Song, index: number) =>
                        <SongCard key={`song${song.id}`} song={song} selected={selectedSong === index} index={index} onClick={this.handleSelect} />
                    )}
                </Menu>
            </div>
        );
    }
}