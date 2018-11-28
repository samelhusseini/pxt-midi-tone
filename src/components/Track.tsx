import * as React from 'react';

export interface TrackProps {
    name: string;
    enthusiasmLevel?: number;
}

export class Track extends React.Component<TrackProps, {}> {
    render() {
        const { enthusiasmLevel } = this.props;
        if (enthusiasmLevel <= 0) {
            throw new Error('You could be a little more enthusiastic. :D');
        }
        return (
            <div className="hello">
                <div className="greeting">
                    Hello {name}
                </div>
            </div>
        );
    }
}