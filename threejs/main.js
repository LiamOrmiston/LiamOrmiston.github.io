import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// create scene
const scene = new THREE.Scene();

// create camera
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 3;

// create renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// add point light
const pointLight = new THREE.PointLight(0xffffff, 300, 100); // Color, Intensity, Distance
pointLight.position.set(5, 5, 5); // Set light position
scene.add(pointLight);

// Create a shelf geometry
var shelfGeometry = new THREE.BoxGeometry(10, 1, 3);
var shelfMaterial = new THREE.MeshBasicMaterial({ color: 0x654321 }); // Brown color
var shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
scene.add(shelf);

// Position the shelf
shelf.position.set(0, -2, -5);

// create loader
const modelLoader = new GLTFLoader();

// create models
var models = [];
modelLoader.load( 'Rock/rock.glb', function ( gltf ) {
    var model = gltf.scene;
    var mesh = model.children[0];
    mesh.position.set(-2, -1, -4);
    mesh.rotate = true; // Initialize rotate
    mesh.userData.originalPosition = mesh.position.clone();
	scene.add(model);
    models.push(mesh);
});

modelLoader.load( 'Rock/rock.glb', function ( gltf ) {
    var model = gltf.scene;
    var mesh = model.children[0];
    mesh.position.set(2, -1, -4);
    mesh.rotate = true; // Initialize rotate
    mesh.userData.originalPosition = mesh.position.clone();
	scene.add(model);
    models.push(mesh);
});

// track object's position and mouse position
var raycaster = new THREE.Raycaster();
var inputPosition = new THREE.Vector2();
var heldModel = null; // Initialize as null to indicate no model is currently held
var isInputDown = false; // Variable to track if input is active
var isDragging = false; // Variable to track if input is being dragged
var previousInputX = 0; // Variable to track previous input position

// Threshold for input movement to consider it a drag
var dragThreshold = 5; // Adjust as needed

// Add event listeners for both mouse and touch events
window.addEventListener('click', onClick, false);
window.addEventListener('mousedown', onInputDown, false);
window.addEventListener('mouseup', onInputUp, false);
window.addEventListener('touchstart', onTouchStart, false);
window.addEventListener('touchmove', onTouchMove, false);
window.addEventListener('touchend', onTouchEnd, false);

function onClick(event) {
    if (!isDragging && !isInputDown) {
        // Calculate input position in normalized device coordinates
        inputPosition.x = (event.clientX / window.innerWidth) * 2 - 1;
        inputPosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Handle click event
        handleInput();
    }
}

function onInputDown(event) {
    isInputDown = true;
    previousInputX = event.clientX || event.touches[0].clientX; // Record initial input position
    isDragging = false; // Reset dragging flag
}

function onInputUp(event) {
    isInputDown = false;
    if (!isDragging && heldModel) {
        // Handle click event if not dragging
        handleInput();
    }
    isDragging = false; // Reset dragging flag
}

function onTouchStart(event) {
    onInputDown(event); // Call the same logic as mouse down
}

function onTouchMove(event) {
    if (isInputDown && heldModel) {
        // Calculate change in input position
        var deltaX = (event.clientX || event.touches[0].clientX) - previousInputX;

        // If input movement exceeds the threshold, consider it a drag
        if (!isDragging && Math.abs(deltaX) > dragThreshold) {
            isDragging = true;
        }

        // Rotate the held model around the y-axis if it's being dragged
        if (isDragging) {
            heldModel.rotateY(deltaX * 0.01); // Adjust rotation speed as needed
        }

        previousInputX = event.clientX || event.touches[0].clientX; // Update previous input position
    }
}

function onTouchEnd(event) {
    onInputUp(event); // Call the same logic as mouse up
}

function handleInput() {
    // Raycast from camera to find intersected objects
    raycaster.setFromCamera(inputPosition, camera);
    var intersects = raycaster.intersectObjects(models, true);

    if (intersects.length > 0) {
        // determine which object was clicked
        var selectedModel = intersects[0].object;
        if (heldModel !== selectedModel) {
            // TODO: this could be a function
            if (heldModel !== null) {
                var targetPosition = heldModel.userData.originalPosition;
                heldModel.position.copy(targetPosition);
                heldModel.rotate = !heldModel.rotate;
            }
            heldModel = selectedModel;
        }
        else {
            heldModel = null;
        }

        // Move the clicked model closer to the camera
        var targetPosition = selectedModel.position.z < -3 ? new THREE.Vector3(0, 0, 1) : selectedModel.userData.originalPosition;
        selectedModel.position.copy(targetPosition);

        // Stop rotation animation for the clicked model
        selectedModel.rotate = !selectedModel.rotate;
    }
}

// Render the scene
function render() {
    requestAnimationFrame(render);
    // rotate the models if their rotate flag is set
    models.forEach(function (model) {
        if( model.rotate) {
            model.rotation.y += 0.01;
        }
    });
    renderer.render(scene, camera);
}
render();
