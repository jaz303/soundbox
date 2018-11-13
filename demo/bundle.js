(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var soundbox = require('../');

function createContext() {
	var ctor = window.AudioContext || window.webkitAudioContext;
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
    this._direct        = !!opts.direct;
    this._playing       = [];

    if (this._exclusive) {
        this._playingIds = {};
    }

    if (this._direct) {
        
        this._target = this._ctx.destination;
    
    } else {

        this._gainNode = this._ctx.createGain();
        this._gainNode.connect(this._ctx.destination);
        this._gain = 1;
        this._muted = false;
        this._setGain(1);

        this._target = this._gainNode;

    }

}

//
// Gain

Track.prototype.mute = function() {
    if (!this._direct) {
        this._muted = true;
        this._setGain(0);    
    }
}

Track.prototype.unmute = function() {
    if (!this._direct) {
        this._muted = false;
        this._setGain(this._gain);    
    }
}

Track.prototype.setGain = function(gain) {
    if (!this._direct) {
        this._gain = gain;
        if (!this._muted) {
            this._setGain(this._gain);
        }    
    }
}

Track.prototype._setGain = function(gain) {
    this._gainNode.setValueAtTime(gain, this._ctx.currentTime);
}

//
//

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
    gainNode.connect(this._target);

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

},{}]},{},[1]);
