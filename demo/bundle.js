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

},{"./lib/Track":3}],3:[function(require,module,exports){
var EMPTY = {};

// promise.fadeOut = function() {
//     var endTime = this.ctx.currentTime + fadeDuration;
//     gain.gain.linearRampToValueAtTime(0, endTime);
//     sourceNode.stop(endTime);
// }

var Track = module.exports = function(soundBox, opts) {
    
    opts = opts || EMPTY;

    this._soundBox      = soundBox;
    this._ctx           = soundBox.audioContext;
    this._buffers       = soundBox.sounds;
    this._maxPolyphony  = typeof opts.maxPolyphony === 'number' ? opts.maxPolyphony : null;
    this._exclusive     = opts.exclusive || false;
    this._playing       = [];

    if (this._exclusive) {
        this._playingIds = {};
    }

}

Track.prototype.cancel = function() {

    // TODO: need a nice way of zapping them all
    
    this._playing = [];
    if (this._exclusive) {
        this._playingIds = {};
    }

}

Track.prototype.play = function(id, opts) {

    var buffer = this._buffers[id];
    if (!buffer) {
        throw new Error("unknown sound ID: " + id);
    }

    if (this._maxPolyphony) {
        while (this._playing.length >= this._maxPolyphony) {
            this._playing.shift().cancel();
        }
    }

    if (this._exclusive) {
        if (id in this._playingIds) {
            this._playingIds[id].cancel();
        }
    }

    var opts        = opts || EMPTY,
        ended       = false,
        sourceNode  = this._ctx.createBufferSource(),
        gainNode    = this._ctx.createGain(),
        gain        = typeof opts.gain === 'number' ? opts.gain : 1,
        resolve     = null,
        instance    = P(function(res) { resolve = res; });

    gainNode.gain.setValueAtTime(gain, this._ctx.currentTime);
    gainNode.connect(this._ctx.destination);

    sourceNode.buffer = buffer;
    sourceNode.connect(gainNode);
 
    instance.cancel = function() {
        if (ended) return;
        sourceNode.stop(0);
        teardown();
    }

    var teardown = function() {
        
        if (ended) return;
        ended = true;
        
        gainNode.disconnect();
        sourceNode.disconnect();

        this._playing.splice(this._playing.indexOf(instance), 1);

        if (this._exclusive) {
            delete this._playingIds[id];
        }

        resolve();

    }.bind(this);

    this._playing.push(instance);

    if (this._exclusive) {
        this._playingIds[id] = instance;
    }

    sourceNode.onended = teardown;
    sourceNode.start(0);

    return instance;

}

},{}]},{},[1])