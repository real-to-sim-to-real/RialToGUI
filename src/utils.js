import * as THREE from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MeshBVHVisualizer } from 'three-mesh-bvh';
import {USDZExporter} from 'three/examples/jsm/exporters/USDZExporter.js'

import {
	Brush,
	Evaluator,
	EdgesHelper,
	TriangleSetHelper,
	logTriangleDefinitions,
	GridMaterial,
	ADDITION,
	SUBTRACTION,
	INTERSECTION,
	DIFFERENCE,
} from 'three-bvh-csg';


export function create_object(type, params, target_mesh) {
    let obj;
	if (type == 'bounding_box') {
		obj = new Brush( new THREE.BoxGeometry(), new GridMaterial() );
		updateBrush( obj, params.boundingBoxShape, params.boundingBoxComplexity );
	} else if (type == 'cylinder') {
		obj = new THREE.Mesh( new THREE.CylinderGeometry(0.05, 0.05, 1, 32), new GridMaterial() );

	} else if(type == "sphere"){
		obj = new THREE.Mesh( new THREE.SphereGeometry(0.05, 32), new THREE.MeshStandardMaterial() );

	} else {
		console.log( 'Unrecognized object' )
	}

	if (target_mesh){
		obj.scale.setScalar(1 );//getRelativeScale(target_mesh, obj) );
		let center_pos = getCenter(target_mesh)
		// obj.position.set( center_pos.x, center_pos.y + 2 * getRelativePos(target_mesh).y, center_pos.z);
	}


	obj.material.opacity = 0.15;
	obj.material.transparent = true;
	obj.material.depthWrite = false;
	obj.material.polygonOffset = true;
	obj.material.polygonOffsetFactor = 0.2;
	obj.material.polygonOffsetUnits = 0.2;
	obj.material.side = THREE.DoubleSide;
	obj.material.premultipliedAlpha = true;
	obj.material.roughness = 0.25;
	// obj.material.color.set( 0xE91E63 ).convertSRGBToLinear();

	obj.receiveShadow = true;
	obj.userData.selectable = true;

	return obj
}


export function updateBrush( brush, type, complexity ) {

	brush.geometry.dispose();
	switch ( type ) {

		case 'sphere':
			brush.geometry = new THREE.SphereGeometry(
				1,
				Math.round( THREE.MathUtils.lerp( 5, 32, complexity ) ),
				Math.round( THREE.MathUtils.lerp( 5, 16, complexity ) )
			);
			break;
		case 'box':
			brush.geometry = new THREE.BoxGeometry( 1, 1, 1 );
			break;
		case 'cylinder':
			brush.geometry = new THREE.CylinderGeometry(
				0.5, 0.5, 1,
				Math.round( THREE.MathUtils.lerp( 5, 32, complexity ) ),
			);
			break;
		case 'torus':
			brush.geometry = new THREE.TorusGeometry(
				0.6,
				0.2,
				Math.round( THREE.MathUtils.lerp( 4, 16, complexity ) ),
				Math.round( THREE.MathUtils.lerp( 6, 30, complexity ) )
			);
			break;
		case 'torus knot':
			brush.geometry = new THREE.TorusKnotGeometry(
				0.6,
				0.2,
				Math.round( THREE.MathUtils.lerp( 16, 64, complexity ) ),
				Math.round( THREE.MathUtils.lerp( 4, 16, complexity ) ),
			);
			break;

	}

	brush.geometry = brush.geometry.toNonIndexed();

	const position = brush.geometry.attributes.position;
	const array = new Float32Array( position.count * 3 );
	for ( let i = 0, l = array.length; i < l; i += 9 ) {

		array[ i + 0 ] = 1;
		array[ i + 1 ] = 0;
		array[ i + 2 ] = 0;

		array[ i + 3 ] = 0;
		array[ i + 4 ] = 1;
		array[ i + 5 ] = 0;

		array[ i + 6 ] = 0;
		array[ i + 7 ] = 0;
		array[ i + 8 ] = 1;

	}

	brush.geometry.setAttribute( 'color', new THREE.BufferAttribute( array, 3 ) );
}


export function getCenter (mesh) {
	var middle = new THREE.Vector3();
	console.log("Getting center", mesh)
	mesh.prepareGeometry()
	var geometry = mesh.geometry;
	geometry.computeBoundingBox();
	middle.x = (geometry.boundingBox.max.x + geometry.boundingBox.min.x) / 2;
	middle.y = (geometry.boundingBox.max.y + geometry.boundingBox.min.y) / 2;
	middle.z = (geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2;

	// let position = mesh.position
	// middle.x -= position.x;
	// middle.y -= position.y;
	// middle.z -= position.z;
	return middle
}


export function getRelativeScale (mesh1, mesh2) {
	let mesh1Bounds = new THREE.Box3().setFromObject( mesh1 );
	let mesh2Bounds = new THREE.Box3().setFromObject( mesh2 );

	// Calculate side lengths of model1
	let lengthMesh1Bounds = {
	x: Math.abs(mesh1Bounds.max.x - mesh1Bounds.min.x),
	y: Math.abs(mesh1Bounds.max.y - mesh1Bounds.min.y),
	z: Math.abs(mesh1Bounds.max.z - mesh1Bounds.min.z),
	};

	// Calculate side lengths of model2
	let lengthMesh2Bounds = {
	x: Math.abs(mesh2Bounds.max.x - mesh2Bounds.min.x),
	y: Math.abs(mesh2Bounds.max.y - mesh2Bounds.min.y),
	z: Math.abs(mesh2Bounds.max.z - mesh2Bounds.min.z),
	};

	// Calculate length ratios
	let lengthRatios = [
	(lengthMesh1Bounds.x / lengthMesh2Bounds.x),
	(lengthMesh1Bounds.y / lengthMesh2Bounds.y),
	(lengthMesh1Bounds.z / lengthMesh2Bounds.z),
	];

	// Select smallest ratio in order to contain the models within the scene
	return Math.min(...lengthRatios)
}

export function getRelativePos (mesh) {
	let meshBounds = new THREE.Box3().setFromObject( mesh );
	return meshBounds.max
}


export function truncate (number, decimal) {
	return Math.trunc(number * 10 ** decimal) / 10 ** decimal
}