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
var mousePosition = new THREE.Vector2();
var heldModel = null; // Initialize as null to indicate no model is currently held
var isMouseDown = false; // Variable to track if mouse button is pressed
var previousMouseX = 0; // Variable to track previous mouse position
var isDragging = false; // Variable to track if mouse is being dragged

// Threshold for mouse movement to consider it a drag
var dragThreshold = 5; // Adjust as needed

// Add event listener for mouse events
window.addEventListener('click', onClick, false);
window.addEventListener('mousedown', onMouseDown, false);
window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('mouseup', onMouseUp, false);

function onClick(event) {
    if (!isDragging && !isMouseDown) {
        // Calculate mouse position in normalized device coordinates
        mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
        mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Raycast from camera to find intersected objects
        raycaster.setFromCamera(mousePosition, camera);
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
}

function onMouseDown(event) {
    isMouseDown = true;
    previousMouseX = event.clientX; // Record initial mouse position
    isDragging = false; // Reset dragging flag
}

function onMouseMove(event) {
    if (isMouseDown && heldModel) {
        // Calculate change in mouse position
        var deltaX = event.clientX - previousMouseX;

        // If mouse movement exceeds the threshold, consider it a drag
        if (!isDragging && Math.abs(deltaX) > dragThreshold) {
            isDragging = true;
        }

        // Rotate the held model around the y-axis if it's being dragged
        if (isDragging) {
            heldModel.rotateY(deltaX * 0.01); // Adjust rotation speed as needed
        }

        previousMouseX = event.clientX; // Update previous mouse position
    }
}

function onMouseUp(event) {
    isMouseDown = false;
    if (!isDragging && heldModel) {
        // Perform click action if not dragging
        // (You can add custom click behavior here)
    }
    // isDragging = false; // Reset dragging flag
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
