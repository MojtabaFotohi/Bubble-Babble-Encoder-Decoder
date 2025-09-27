
class BubbleBabble {
    constructor(vowels = 'aeiouy', consonants = 'bcdfghklmnprstvzx', padding = null) {
        this.vowels = vowels;
        this.consonants = consonants;
        this.padding = padding || this.consonants[this.consonants.length - 1];
    }

    encode(src) {
        if (typeof src === 'string') {
            src = new TextEncoder().encode(src);
        }
        let out = this.padding;
        let c = 1;
        for (let i = 0; i < src.length + 1; i += 2) {
            if (i >= src.length) {
                out += this.vowels[c % 6] + this.consonants[16] + this.vowels[Math.floor(c / 6)];
                break;
            }
            const byte1 = src[i];
            if (byte1 < 0 || byte1 > 255) throw new Error('Invalid byte value in input');
            out += this.vowels[(((byte1 >> 6) & 3) + c) % 6];
            out += this.consonants[(byte1 >> 2) & 15];
            out += this.vowels[((byte1 & 3) + Math.floor(c / 6)) % 6];
            if (i + 1 >= src.length) break;
            const byte2 = src[i + 1];
            if (byte2 < 0 || byte2 > 255) throw new Error('Invalid byte value in input');
            out += this.consonants[(byte2 >> 4) & 15];
            out += '-';
            out += this.consonants[byte2 & 15];
            c = (c * 5 + byte1 * 7 + byte2) % 36;
        }
        out += this.padding;
        return out;
    }

    decode(src) {
        let c = 1;
        if (src[0] !== this.padding) throw new Error(`Invalid format: Must begin with '${this.padding}'`);
        if (src[src.length - 1] !== this.padding) throw new Error(`Invalid format: Must end with '${this.padding}'`);
        if (src.length !== 5 && src.length % 6 !== 5) throw new Error("Invalid format: Incorrect length");
        src = src.slice(1, -1);
        const tuples = [];
        for (let x = 0; x < src.length; x += 6) {
            tuples.push(src.substring(x, x + 6));
        }
        const out = [];
        tuples.forEach((tup, k) => {
            const pos = k * 6;
            const tupl = this._decode_tuple(tup, pos);
            if (k === tuples.length - 1) {
                if (tupl[1] === 16) {
                    if (tupl[0] !== c % 6) throw new Error(`Checksum mismatch at offset ${pos}`);
                    if (tupl[2] !== Math.floor(c / 6)) throw new Error(`Checksum mismatch at offset ${pos + 2}`);
                } else {
                    const byte = this._decode_3way_byte(tupl[0], tupl[1], tupl[2], pos, c);
                    out.push(byte);
                }
            } else {
                const byte1 = this._decode_3way_byte(tupl[0], tupl[1], tupl[2], pos, c);
                const byte2 = this._decode_2way_byte(tupl[3], tupl[5], pos + 3);
                out.push(byte1);
                out.push(byte2);
                c = (c * 5 + byte1 * 7 + byte2) % 36;
            }
        });
        return new Uint8Array(out);
    }

    _decode_tuple(src) {
        const tupl = [
            this.vowels.indexOf(src[0]),
            this.consonants.indexOf(src[1]),
            this.vowels.indexOf(src[2])
        ];
        if (src.length > 3) {
            tupl.push(this.consonants.indexOf(src[3]));
            tupl.push('-');
            tupl.push(this.consonants.indexOf(src[5]));
        }
        return tupl;
    }

    _decode_2way_byte(a1, a2, offset) {
        if (a1 > 15) throw new Error(`Invalid data at offset ${offset}`);
        if (a2 > 15) throw new Error(`Invalid data at offset ${offset + 2}`);
        return (a1 << 4) | a2;
    }

    _decode_3way_byte(a1, a2, a3, offset, c) {
        let high2 = (a1 - (c % 6) + 6) % 6;
        if (high2 >= 4) throw new Error(`Invalid data at offset ${offset}`);
        if (a2 > 15) throw new Error(`Invalid data at offset ${offset + 1}`);
        const mid4 = a2;
        let low2 = (a3 - (Math.floor(c / 6) % 6) + 6) % 6;
        if (low2 >= 4) throw new Error(`Invalid data at offset ${offset + 2}`);
        return (high2 << 6) | (mid4 << 2) | low2;
    }
}

const bb = new BubbleBabble();

function encodeIt() {
    const input = document.getElementById('input').value;
    const outputElem = document.getElementById('output');
    try {
        const encoded = bb.encode(input);
        outputElem.value = encoded;
    } catch (e) {
        outputElem.value = 'Encoding failed: ' + e.message + '\nPlease check your input and try again.';
    }
}

function decodeIt() {
    const input = document.getElementById('input').value;
    const outputElem = document.getElementById('output');
    try {
        const decodedBytes = bb.decode(input);
        const decodedText = new TextDecoder('utf-8').decode(decodedBytes);
        outputElem.value = decodedText;
    } catch (e) {
        outputElem.value = 'Decoding failed: ' + e.message + '\nPlease verify the encoded string and try again.';
    }
}
