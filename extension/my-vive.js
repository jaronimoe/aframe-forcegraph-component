
// var THREE = require('../lib/three');


var CLAMP_VELOCITY = 0.00001;
var MAX_DELTA = 0.2;
var KEYS = [
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'
];
var vive_keys = {};
var vive_axis = [0, 0];

var TRIGGER_OPTIONS = [
    'fly', 'click', 'no-action'];

var myvive_data;
var parseFn = function(prop) {
    var geval = eval; // Avoid using eval directly https://github.com/rollup/rollup/wiki/Troubleshooting#avoiding-eval
    try {
        var evalled = geval('(' + prop + ')');
        return evalled;
    }
    catch (e) {} // Can't eval, not a function
    return null;
};
/**
 *  component to control entities using vive controls.
 */
AFRAME.registerComponent('my-vive', {
    schema: {
        acceleration: {default: 65},
        adAxis: {default: 'x', oneOf: ['x', 'y', 'z']},
        adEnabled: {default: true},
        adInverted: {default: false},
        easing: {default: 20},
        enabled: {default: true},
        fly: {default: true},
        wsAxis: {default: 'z', oneOf: ['x', 'y', 'z']},
        wsEnabled: {default: true},
        wsInverted: {default: false},
        strafeLft: {default: false},
        strafeRght: {default: false},
        moveFrw: {default: false},
        moveBcl: {default: false},
        camID: {default: 'a-entity[camera]'},  //uses the rotation vector of this entity for moving forward/backward & strafing
        elID: {default: ''},  //uses the rotation vector of this entity for moving forward/backward & strafing
        triggerConf: {default: 0},
        onTriggerDown: {parse: parseFn, default: function() {console.log("onTriggerDown. (no function defined..)")}},
        onTriggerUp: {parse: parseFn, default: function() {console.log("onTriggerUp. (no function defined..)")}}
    },

    init: function () {
        myvive_data = this.data;
        // To keep track of the pressed keys.
        this.keys = {};

        vive_keys.moveFrw = false;
        vive_keys.moveBck = false;
        vive_keys.strafeLft = false;
        vive_keys.strafeRght = false;

        this.position = {};
        this.velocity = new THREE.Vector3();

        this.movingElement = {};
        this.movingElement = (this.data.elID == '' ? this.el : this.getElement(this.data.elID));
        console.log("moving element = ");
        console.log(this.movingElement);

        this.directionElement = {};
        this.directionElement = this.getElement(this.data.camID);
        console.log("direction element = ");
        console.log(this.directionElement);

        // Bind methods and add event listeners.
        // this.onBlur = bind(this.onBlur, this);
        // this.onFocus = bind(this.onFocus, this);
        // this.onKeyDown = bind(this.onKeyDown, this);
        // this.onKeyUp = bind(this.onKeyUp, this);
        // this.onVisibilityChange = bind(this.onVisibilityChange, this);
        // this.attachVisibilityEventListeners();
    },

    tick: function (time, delta) {
        var currentPosition;
        var data = this.data;
        var el = this.movingElement; //this.el;
        var movementVector;
        var position = this.position;
        var velocity = this.velocity;

        //todo: return when no vive controller input is incoming
        // if (!velocity[data.adAxis] && !velocity[data.wsAxis] &&
        //     isEmptyObject(this.keys)) { return; }

        // Update velocity.
        delta = delta / 1000;
        this.updateVelocity(delta);

        if (!velocity[data.adAxis] && !velocity[data.wsAxis]) { return; }

        // Get movement vector and translate position.
        currentPosition = el.getAttribute('position');
        movementVector = this.getMovementVector(delta);
        position.x = currentPosition.x + movementVector.x;
        position.y = currentPosition.y + movementVector.y;
        position.z = currentPosition.z + movementVector.z;
        el.setAttribute('position', position);
    },

    remove: function () {
        this.removeKeyEventListeners();
        this.removeVisibilityEventListeners();
    },

    play: function () {
        this.attachKeyEventListeners();
    },

    pause: function () {
        this.keys = {};
        this.removeKeyEventListeners();
    },

    updateVelocity: function (delta) {
        var acceleration;
        var adAxis;
        var adSign;
        var data = this.data;
        var keys = this.keys;
        var velocity = this.velocity;
        var wsAxis;
        var wsSign;

        adAxis = data.adAxis;
        wsAxis = data.wsAxis;

        // If FPS too low, reset velocity.
        if (delta > MAX_DELTA) {
            velocity[adAxis] = 0;
            velocity[wsAxis] = 0;
            return;
        }

        // Decay velocity.
        if (velocity[adAxis] !== 0) {
            velocity[adAxis] -= velocity[adAxis] * data.easing * delta;
        }
        if (velocity[wsAxis] !== 0) {
            velocity[wsAxis] -= velocity[wsAxis] * data.easing * delta;
        }

        // Clamp velocity easing.
        if (Math.abs(velocity[adAxis]) < CLAMP_VELOCITY) { velocity[adAxis] = 0; }
        if (Math.abs(velocity[wsAxis]) < CLAMP_VELOCITY) { velocity[wsAxis] = 0; }

        if (!data.enabled) { return; }

        // Update velocity using keys pressed.
        acceleration = data.acceleration;
        if (data.adEnabled) {
            adSign = data.adInverted ? -1 : 1;
            // if (vive_keys.strafeLft) { velocity[adAxis] -= adSign * acceleration * delta; }
            // if (vive_keys.strafeRght) { velocity[adAxis] += adSign * acceleration * delta; }
            velocity[adAxis] += vive_axis[0]* acceleration * delta;

        }
        if (data.wsEnabled) {
            wsSign = data.wsInverted ? -1 : 1;
            // if (keys.KeyW || keys.ArrowUp) { velocity[wsAxis] -= wsSign * acceleration * delta; }
            if ( vive_keys.moveFrw) { velocity[wsAxis] -= wsSign * acceleration * delta; }
            if ( vive_keys.moveBck) { velocity[wsAxis] += wsSign * acceleration * delta; }
            velocity[wsAxis] -= vive_axis[1]* acceleration * delta;

        }
    },

    getMovementVector: (function () {
        var directionVector = new THREE.Vector3(0, 0, 0);
        var rotationEuler = new THREE.Euler(0, 0, 0, 'YXZ');

        return function (delta) {

            var rotation = this.directionElement.getAttribute('rotation');
            var velocity = this.velocity;
            var xRotation;

            directionVector.copy(velocity);
            directionVector.multiplyScalar(delta);

            // Absolute.
            if (!rotation) { return directionVector; }

            xRotation = this.data.fly ? rotation.x : 0;

            // Transform direction relative to heading.
            rotationEuler.set(THREE.Math.degToRad(xRotation), THREE.Math.degToRad(rotation.y), 0);
            directionVector.applyEuler(rotationEuler);
            return directionVector;
        };
    })(),
    getElement: function (elementid) {
        var element = document.querySelector(elementid);
        return element;
    },

    attachVisibilityEventListeners: function () {
        window.addEventListener('blur', this.onBlur);
        window.addEventListener('focus', this.onFocus);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
    },

    removeVisibilityEventListeners: function () {
        window.removeEventListener('blur', this.onBlur);
        window.removeEventListener('focus', this.onFocus);
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
    },

    attachKeyEventListeners: function () {
        window.addEventListener('triggerup', this.triggerup);
        window.addEventListener('triggerdown', this.triggerdown);
        window.addEventListener('trackpaddown', this.trackpaddown);
        window.addEventListener('trackpadup', this.trackpadup);
        window.addEventListener('trackpadchanged', this.trackpadchanged);
        window.addEventListener('axismove', this.axismoved);
    },

    removeKeyEventListeners: function () {
        window.removeEventListener('triggerup', this.triggerup);
        window.removeEventListener('triggerdown', this.triggerdown);
        window.removeEventListener('trackpaddown', this.trackpaddown);
        window.removeEventListener('trackpadup', this.trackpadup);
        window.removeEventListener('trackpadchanged', this.trackpadchanged);
        window.removeEventListener('axismove', this.axismoved);
    },

    onBlur: function () {
        this.pause();
    },

    onFocus: function () {
        this.play();
    },

    onVisibilityChange: function () {
        if (document.hidden) {
            this.onBlur();
        } else {
            this.onFocus();
        }
    },

    triggerup: function (event) {
        // console.log("trigger up!");
        // this.data.moveFrw = false;
        vive_keys.moveFrw = false;
    },
    triggerdown: function (event) {

        //todo: pass myvive_data instead of using global----
        switch (myvive_data.triggerConf)
        {
            case 0: //fly forward
                vive_keys.moveFrw = true;
                break;
            case 1: //set click
                //TODO: call click handler
                // console.log("handle trigger down")
                myvive_data['onTriggerDown']();
                break;
            case 2:
                break;
            default:
                console.warn("undefined trigger config: " + myvive_data.triggerConf);
                break;
        }
    },
    trackpaddown: function (event) {
        // console.log("trackpaddown!");
    },
    trackpadup: function (event) {
        // console.log("trackpadup!");
    },
    trackpadchanged: function (event) {
        // console.log("trackpadchanged!");
    },

    axismoved: function(event) {
        // console.log(event.detail.axis);
        vive_axis = event.detail.axis;
    },

    locparseFn : function(prop) {
        console.log("local parse (my-vive)")
        var geval = eval; // Avoid using eval directly https://github.com/rollup/rollup/wiki/Troubleshooting#avoiding-eval
        try {
            console.log(prop)

            var evalled = geval('(' + prop + ')');
            return evalled;
        }
        catch (e) {
            console.warn("tried to parse invalid function")
        } // Can't eval, not a function
        return null;
    },

    updateMoveEl: function (moveEl) {
        this.data.elID = moveEl;
        this.movingElement = (this.data.elID == '' ? this.el : this.getElement(this.data.elID));
        console.log("=> updated moving element:");
        console.log(this.movingElement);

    },
    updateCamEl: function (camEl) {
        this.data.camID = camEl;
        this.directionElement = this.getElement(this.data.camID);
        console.log("=> updated direction element:");
        console.log(this.directionElement);
    }


});

