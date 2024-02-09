import * as THREE from 'three';

// create scene
const scene = new THREE.Scene();

// create camera
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 2;

// create renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// add point light
const pointLight = new THREE.PointLight(0xffffff, 300, 100); // Color, Intensity, Distance
pointLight.position.set(5, 5, 5); // Set light position
scene.add(pointLight);

// create loader
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const loader = new GLTFLoader();

// load model
let model;
loader.load( 'Rock/rock.glb', function ( gltf ) {
    model = gltf.scene;
	scene.add( model );
}, undefined, function ( error ) {
	console.log( error );
} );

// // add orbital control
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// const controls = new OrbitControls( camera, renderer.domElement );
// controls.update();

const sensitivity = 0.05; // Adjust rotation sensitivity

document.addEventListener('mousemove', function(event) {
    const { clientX, clientY } = event;
    const { innerWidth, innerHeight } = window;
    
    const mouseX = clientX / innerWidth * 2 - 1;
    const mouseY = -(clientY / innerHeight) * 2 + 1;
    
    const rotationSpeedX = sensitivity * mouseX;
    const rotationSpeedY = sensitivity * mouseY;
    
    model.rotation.y += rotationSpeedX;
    model.rotation.x += rotationSpeedY;
});

function animate() {
	requestAnimationFrame( animate );
    // Update controls
    // controls.update();
	renderer.render( scene, camera );
}
animate();
