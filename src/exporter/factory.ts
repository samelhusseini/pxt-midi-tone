
import { AbstractEmitter } from "./abstract";
import { MixerEmitter } from './mixer';
import { MicrobitEmitter } from './microbit';
import { AdafruitEmitter } from './adafruit';

export class EmitterFactory {

    static getEmitter(target: string): AbstractEmitter {
        switch (target) {
            case "arcade": {
                return new MixerEmitter();
            }
            case "adafruit": {
                return new AdafruitEmitter();
            }
            case "microbit": {
                return new MicrobitEmitter();
            }
            default:
                return undefined;
        }
    }
}