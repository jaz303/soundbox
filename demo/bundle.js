(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var soundbox = require('../');

function createContext() {
	var ctor = window.audioContext || window.webkitAudioContext;
	return new ctor();
}

window.init = function() {

	var box = soundbox(createContext());

	box.load({
		's1'	: 'stab-1.wav',
		's2'	: 'stab-2.wav',
		's3'	: 'stab-3.wav'
	}).then(function() {

		console.log("samples loaded...");

		setTimeout(function() {
			box.playOneShot('s1').then(function() {
				console.log("s1 end");
			});
		}, 0);

		setTimeout(function() {
			box.playOneShot('s2', {gain: 0.3}).then(function() {
				console.log("s2 end");
			});
		}, 1000);

		setTimeout(function() {
			box.playOneShot('s3').then(function() {
				console.log("s3 end");
			});
		}, 2000);

	})

}
},{"../":2}],2:[function(require,module,exports){
module.exports = SoundBox;

var P = function(fn) { return new Promise(fn); }
var X = function() { return new XMLHttpRequest(); }

var EMPTY = {};

function SoundBox(audioContext) {

    if (!(this instanceof SoundBox)) {
        return new SoundBox(audioContext);
    }

    this.ctx = audioContext;
    this.sounds = {};

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
},{}]},{},[1])