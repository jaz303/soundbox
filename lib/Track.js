var Track = module.exports = function(soundBox, opts) {
    this._soundBox      = soundBox;
    this._ctx           = soundBox.audioContext;
    this._buffers       = soundBox.sounds;
    this._playing       = [];
    this._maxPolyphony  = Infinity;
}

Track.prototype.play = function(id) {

    var buffer = this._buffers[id];
    if (!buffer) {
        // TODO: return null audio instance
    }

    while (this._playing.length >= this._maxPolyphony) {
        // TODO: kill a sound based on policy?
        this._playing.shift().cancel();
    }

    var opts = opts || EMPTY;

    var sourceNode      = this._ctx.createBufferSource(),
        gainNode        = this._ctx.createGain(),
        stopped         = false;

    sourceNode.buffer = buffer;
    sourceNode.connect(gainNode);

    var gainVal = ('gain' in opts) ? opts.gain : 1;

    gainNode.gain.setValueAtTime(gainVal, this._ctx.currentTime);
    gainNode.connect(this._ctx.destination);

    var ended       = false,
        resolve     = null,
        instance    = P(function(res) { resolve = res; });

    this._playing.push(instance);

    instance.cancel = function() {
        if (ended) return;
        sourceNode.stop(0);
        teardown();    
    }

    var teardown = function() {
        if (ended) return;
        ended = true;
        sourceNode.disconnect();
        gainNode.disconnect();
        this._playing.splice(this._playing.indexOf(instance), 1);
        resolve();
    }.bind(this);

    sourceNode.onended = teardown;
    sourceNode.start(0);

    return instance;

}