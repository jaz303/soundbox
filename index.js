module.exports = SoundBox;

var Track = require('./lib/Track');

var P = function(fn) { return new Promise(fn); }
var X = function() { return new XMLHttpRequest(); }

function SoundBox(audioContext) {

    if (!(this instanceof SoundBox)) {
        return new SoundBox(audioContext);
    }

    this.audioContext   = audioContext;
    this.sounds         = {};
    this.namedTracks    = {};
    this.defaultTrack   = this.addTrack('default');

}

SoundBox.configure = function(opts) {
    if ('createPromise' in opts) {
        P = opts.createPromise;
    }
    if ('createXMLHttpRequest' in opts) {
        X = opts.createXMLHttpRequest;
    }
}

SoundBox.prototype.load = function(samples) {

    var self = this;

    return P(function(resolve, reject) {

        var failed = false;
        var remaining = 0;

        function fail(err) {
            if (failed) {
                return;
            } else {
                failed = true;
                reject(err);
            }
        }

        function loadOne(id, sampleUrl) {
            var xhr = X();
            xhr.open('GET', sampleUrl);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function() {
                self.audioContext.decodeAudioData(xhr.response, function(buffer) {
                    if (!buffer) {
                        fail(new Error("error decoding audio data"));
                    } else {
                        self.sounds[id] = buffer;
                        if (--remaining === 0) {
                            resolve();
                        }
                    }
                });
            }
            xhr.onerror = function(err) {
                failed(err);
            }
            xhr.send();
        }

        for (var k in samples) {
            remaining++;
            loadOne(k, samples[k]);
        }

    });

}

SoundBox.prototype.getTrack = function(name) {
    if (name in this.namedTracks) {
        return this.namedTracks[name];
    } else {
        throw new Error("unknown track: " + name);
    }
}

SoundBox.prototype.addTrack = function(name, opts) {
    
    if (typeof name === 'object') {
        opts = name;
        name = null;
    }

    var track = new Track(this, opts);

    if (name) {
        this.namedTracks[name] = track;
    }

    return track;

}

SoundBox.prototype.play = function(id, opts) {
    return this.defaultTrack.play(id, opts);
}
