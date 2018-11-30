import * as React from 'react';
import { Menu } from 'semantic-ui-react';

import { Segment } from 'semantic-ui-react';

export interface SongCardProps {
    song: Song;
    index?: number;
    selected?: boolean;
    onClick?: (index: number) => void;
}

export class SongCard extends React.Component<SongCardProps, {}> {

    constructor(props: SongCardProps) {
        super(props);

        this.handleClick = this.handleClick.bind(this);
    }

    handleClick() {
        const { index, onClick } = this.props;
        if (onClick) onClick(index);
    }

    render() {
        const { song, selected } = this.props;

        return (<Menu.Item active={selected} onClick={this.handleClick} name={song.title} />);
    }
}