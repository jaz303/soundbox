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