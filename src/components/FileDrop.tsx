import * as React from 'react';

export interface FileDropProps {
    parseFile: (file: any) => void;
}

export class FileDrop extends React.Component<FileDropProps, {}> {

    constructor(props: FileDropProps) {
        super(props);

        this.onFileChange = this.onFileChange.bind(this);
    }

    private fileDrop: HTMLDivElement;

    componentDidMount() {
        const fileDrop = this.fileDrop;
        fileDrop.addEventListener("dragenter", function () {
            fileDrop.classList.add("Hover");
        });

        fileDrop.addEventListener("dragleave", function () {
            fileDrop.classList.remove("Hover");
        });

        fileDrop.addEventListener("drop", function () {
            fileDrop.classList.remove("Hover");
        });
    }

    onFileChange(e: any) {
        const { parseFile } = this.props;
        //get the files
        let files = e.target.files;
        if (files.length > 0) {
            let file = files[0];
            document.querySelector("#FileDrop #Text").textContent = file.name;
            parseFile(file);
        }
    }

    handleFileDropRef = (e: HTMLDivElement) => {
        this.fileDrop = e;
    }

    render() {
        return (
            <div id="FileDrop" ref={this.handleFileDropRef}>
                <div id="Text">Drop a MIDI file here</div>
                <input type="file" accept="audio/midi" onChange={this.onFileChange} />
            </div>
        );
    }
}