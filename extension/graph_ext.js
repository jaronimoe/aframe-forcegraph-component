

var hlcolor = {};
hlcolor.r = 0.5;
hlcolor.g = 0.5;
hlcolor.b = 0.5;

var highlightmat = new window.THREE.MeshLambertMaterial({
    color: hlcolor,
    transparent: true,
    opacity: 1
});


var prev_mat = {};
var prev_node = {};
var cctv;

function onNodeHover(args)
{
    if(prev_node && prev_mat)
    {
        prev_node.material = prev_mat;
    }

    if(args)
    {
        // console.log(args);
        var node = args;

        prev_mat = node.material;
        prev_node = node;
        node.material = highlightmat;
    }
}


function onNodeMouseClick(args) {
    if(args) {
        console.log(args);
        flyToNode(args, currentRig.parentEl, currentRig, "o_cam");
    }
}


function viveTriggerDown() {
    // console.log("vive trigger down")
    fgraph.components.forcegraph.state.input = "mouseclicked";
}

function viveTriggerUp() {
    // console.log("vive trigger up")
}




function flyToNode(node, flyingElement, blockedElement, blockedElementID)
{
    if(blockedElement.id == blockedElementID){
        console.log("fly to blocked")
        return;
    }

    //get node position
    var nodepos = node.position;

    // Aim at node from outside it
    const distance = 40;
    const distRatio = 1 + distance/Math.hypot(nodepos.x, nodepos.y, nodepos.z);

    cameraPosition(flyingElement,
        nodepos, //{ x: nodepos.x * distRatio, y: nodepos.y * distRatio, z: nodepos.z * distRatio }, // new position
        nodepos, // lookAt ({ x, y, z })
        3000  // ms transition duration
    );
}


function cameraPosition( movingEl, position, lookAt, transitionDuration) {
    const camera = movingEl.object3D;

    //todo: update lookat

    // Setter
    if (position) {
        const finalPos = position;
        const finalLookAt = lookAt || {x: 0, y: 0, z: 0};

        if (!transitionDuration) { // no animation
            setCameraPos(finalPos);
            // setLookAt(finalLookAt);
        } else {
            const camPos = Object.assign({}, camera.position);
            // const camLookAt = getLookAt();

            new TWEEN.Tween(camPos)
                .to(finalPos, transitionDuration)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onUpdate(setCameraPos)
                .start();

            // Face direction in 1/3rd of time
            // new TWEEN.Tween(camLookAt)
            //     .to(finalLookAt, transitionDuration / 3)
            //     .easing(TWEEN.Easing.Quadratic.Out)
            //     .onUpdate(setLookAt)
            //     .start();

        }
        return this;
    }

    // Getter
    return Object.assign({}, camera.position, { lookAt: getLookAt() });

    //

    function setCameraPos() {
        const { x, y, z } = this;
        if (x !== undefined) camera.position.x = x;
        if (y !== undefined) camera.position.y = y;
        if (z !== undefined) camera.position.z = z;
        // console.log(this)
    }

    function setLookAt(lookAt) {
        // state.controls.target = new three.Vector3(lookAt.x, lookAt.y, lookAt.z);
    }

    function getLookAt() {
        return Object.assign(
            (new three.Vector3(0, 0, -1000))
                .applyQuaternion(camera.quaternion)
                .add(camera.position)
        );
    }
}

function putCamToObj(obj)
{
    var pos = obj.position;
    // var  cam =  document.querySelector('a-entity[camera]');
    const camera = currentRig.object3D;
    if (pos.x !== undefined) camera.position.x = pos.x;
    if (pos.y !== undefined) camera.position.y = pos.y;
    if (pos.z !== undefined) camera.position.z = pos.z;
}

var camsl;
var prevRig;
var currentRig;
var elll;



AFRAME.registerComponent('change-color-on-hover', {
    schema: {
        color: {default: 'blue'}
    },

    init: function () {
        var data = this.data;
        var el = this.el;  // <a-box>
        var defaultColor = el.getAttribute('material').color;

        el.addEventListener('mouseenter', function () {
            // console.log(el);
            el.setAttribute('material', "color: " + data.color);
        });

        el.addEventListener('mouseleave', function () {
            el.setAttribute('material', "color: " + defaultColor);
        });

        console.log("hover component registered.");
    }
});


