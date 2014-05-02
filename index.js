module.exports = SoundBox;

function P(fn) {
    return new Promise(fn);
}

var EMPTY = {};

function SoundBox(audioContext) {

    if (!(this instanceof SoundBox)) {
        return new SoundBox(audioContext);
    }

    this.ctx = audioContext;
    this.sounds = {};

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
            var xhr = new XMLHttpRequest();
            xhr.open('GET', sampleUrl);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function() {
                self.ctx.decodeAudioData(xhr.response, function(buffer) {
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

SoundBox.prototype.playOneShot = function(id, opts) {
    return this.play(id, opts);
}

SoundBox.prototype.play = function(id, opts) {

    var buffer = this.sounds[id];
    if (!buffer) {
        throw new Error("unknown sound: " + id);
    }

    opts = opts || EMPTY;

    var sourceNode  = this.ctx.createBufferSource(),
        gainNode    = this.ctx.createGain(),
        stopped     = false;

    sourceNode.buffer = buffer;
    sourceNode.connect(gainNode);

    var gainVal = ('gain' in opts) ? opts.gain : 1;

    gainNode.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gainNode.connect(this.ctx.destination);

    var promise = P(function(resolve, reject) {
        sourceNode.onended = function() {
            sourceNode.disconnect();
            gainNode.disconnect();
            resolve();
        }
        sourceNode.start(0);
    });

    promise.fadeOut = function() {
        var endTime = this.ctx.currentTime + fadeDuration;
        gain.gain.linearRampToValueAtTime(0, endTime);
        sourceNode.stop(endTime);
    }

    promise.stop = function() {
        sourceNode.stop(0);
    }

    return promise;

}