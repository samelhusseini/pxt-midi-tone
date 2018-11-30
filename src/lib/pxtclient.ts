import * as EventEmitter from 'eventemitter3';

export class PXTClient {

    private eventEmitter: EventEmitter;

    constructor() {
        this.eventEmitter = new EventEmitter();
    }

    on(eventName: string, listener: EventEmitter.ListenerFn) {
        this.eventEmitter.on(eventName, listener);
    }

    removeEventListener(eventName: string, listener: EventEmitter.ListenerFn) {
        this.eventEmitter.removeListener(eventName, listener);
    }

    emit(eventName: string, payload: Object, error = false) {
        this.eventEmitter.emit(eventName, payload, error);
    }

    getEventEmitter() {
        return this.eventEmitter;
    }
}