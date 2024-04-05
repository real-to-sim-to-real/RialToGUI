import * as THREE from 'three';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
// import {USDZExporter} from 'three/examples/jsm/exporters/USDZExporter.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { EffectComposer, Pass } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';	
import {
	Brush,
	Evaluator,
	//EdgesHelper,
	TriangleSetHelper,
	logTriangleDefinitions,
	GridMaterial,
	ADDITION,
	SUBTRACTION,
	INTERSECTION,
	DIFFERENCE,
} from 'three-bvh-csg';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { Vector3 } from 'three';


import * as utils from './utils.js'
import { USDZExporter } from './USDZExporter.js' 
import initialData from "./sample-default.json";


export default class SceneInit {
  constructor(canvasId, setTreeData, treeData) {

    console.log("treeData", treeData)
    
    this.setTreeData = setTreeData
    this.treeData = treeData

    // NOTE: Core components to initialize Three.js app.
    this.scene = undefined;
    this.camera = undefined;
    this.renderer = undefined;

    // NOTE: Camera params;
    this.fov = 45;
    this.nearPlane = 1;
    this.farPlane = 1000;
    this.canvasId = canvasId;

    // NOTE: Additional components.
    this.clock = undefined;
    this.stats = undefined;
    this.controls = undefined;

    // NOTE: Lighting is basically required.
    this.ambientLight = undefined;
    this.directionalLight = undefined;

    this.raycaster = new THREE.Raycaster(); // create once
    this.clickMouse = new THREE.Vector2();  // create once

    this.display_info = {'name': '', 
        'rigid_body': false,
        'collider': false,
        'mass': 0,
        'position_x': '', 
        'position_y': '', 
        'position_z': '',
        'rotation_x': '', 
        'rotation_y': '', 
        'rotation_z': '',
        'scale_x': '', 
        'scale_y': '', 
        'scale_z': '',
        'upperLimit': '',
        'lowerLimit': '',
    };

    this.uploadInfo = {'uid': '', 
    };

    this.selected_mesh = [];
    this.renderer = undefined
    this.camera = undefined;
    this.scene = undefined; 
    this.gui = undefined;
    this.outputContainer = undefined;
    this.outlinePass = undefined;
    this.composer = undefined;
    this.controls = undefined;
    this.transformControls = undefined;
    this.bounding_box = undefined
    this.cylinder = undefined;
    this.light = undefined;
    this.needsUpdate = true;
    this.csgEvaluator = undefined;
    this.cut_selected = undefined;
    this.transform_enabled = false;
    this.two_meshes = [];
    this.joint_enabled = false;
    this.site = null;
    this.joint_info = {"upperLimit":90, "lowerLimit":-90}


    this.boundingBoxShape = 'box';
    this.boundingBoxComplexity = 1;
    this.boundingBoxColor = '#E91E63';

    this.edgeStrength = 3.0; 
    this.edgeGlow = 0.0;
    this.edgeThickness = 1.0;
    this.pulsePeriod = 0;
    this.rotate = false;
    this.usePatternTexture = false;
  }

  initialize() {
    const bgColor = 0x111111;

	//this.outputContainer = document.getElementById( 'output' );

	// renderer setup
	this.renderer = new THREE.WebGLRenderer( { antialias: true } );
	this.renderer.setPixelRatio( window.devicePixelRatio );
	this.renderer.setSize( window.innerWidth, window.innerHeight );
	this.renderer.setClearColor( bgColor, 1 );
	this.renderer.shadowMap.enabled = true;
	this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	this.renderer.outputEncoding = THREE.sRGBEncoding;
	document.body.appendChild( this.renderer.domElement );

	// scene setup
	this.scene = new THREE.Scene();
	this.scene.background = new THREE.Color( 0x808080 )

	// lights
	this.light = new THREE.DirectionalLight( 0xffffff, 1 );
	this.light.position.set( - 1, 1, 1 );
	this.scene.add( this.light, this.light.target );
	this.scene.add( new THREE.AmbientLight( 0xb0bec5, 0.1 ) );
    this.light = new THREE.DirectionalLight( 0xffffff, 1 );
	this.light.position.set( 1, 1, 1 );
	this.scene.add( this.light, this.light.target );
    this.light = new THREE.DirectionalLight( 0xffffff, 1 );
	this.light.position.set( 1, 1, -1 );
	// this.scene.add( this.light, this.light.target );
    this.light = new THREE.DirectionalLight( 0xffffff, 1 );
	this.light.position.set( -1, 1, -1 );
	this.scene.add( this.light, this.light.target );
	this.scene.add( new THREE.AmbientLight( 0xb0bec5, 0.1 ) );

	// shadows
	const shadowCam = this.light.shadow.camera;
	this.light.castShadow = true;
	this.light.shadow.mapSize.setScalar( 4096 );
	this.light.shadow.bias = 1e-5;
	this.light.shadow.normalBias = 1e-2;

	shadowCam.left = shadowCam.bottom = - 2.5;
	shadowCam.right = shadowCam.top = 2.5;
	shadowCam.updateProjectionMatrix();

	// camera setup
	this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 50 );
	this.camera.position.set( 1, 2, 4 );
	this.camera.far = 100;
	this.camera.updateProjectionMatrix();

	// controls
	this.controls = new OrbitControls( this.camera, this.renderer.domElement );
	this.controls.saveState();


	this.transformControls = new TransformControls( this.camera, this.renderer.domElement );
	this.transformControls.setSize( 0.75 );
	this.transformControls.addEventListener( 'dragging-changed', e => {

		this.controls.enabled = ! e.value;
        this.updateLine()
	} );
	this.transformControls.addEventListener( 'objectChange', () => {

		this.needsUpdate = true;

	} );
	this.scene.add( this.transformControls );

	// add outlinePass
	this.composer = new EffectComposer( this.renderer );
	const renderPass = new RenderPass( this.scene, this.camera );
	renderPass.outputEncoding = THREE.sRGBEncoding;
	this.composer.addPass( renderPass );

	this.outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), this.scene, this.camera );
	this.composer.addPass( this.outlinePass );

	const gammaCorrectionPass = new ShaderPass( GammaCorrectionShader );
	this.composer.addPass(gammaCorrectionPass)

	this.outlinePass.renderToScreen = true;
	this.outlinePass.edgeStrength = this.edgeStrength;
	this.outlinePass.edgeGlow = this.edgeGlow;
	this.outlinePass.visibleEdgeColor.set(0xffffff);
	this.outlinePass.hiddenEdgeColor.set(0xffffff);

	// bunny mesh has no UVs so skip that attribute
	this.csgEvaluator = new Evaluator();

    // Add Table
    this.setUpScene()

	// gui
	this.gui = new GUI();
	this.gui.add( this, 'preCut' );
	this.gui.add( this, 'postCut' );
	this.gui.add( this, 'preAddSite' );
	this.gui.add( this, 'postAddSite' );
	this.gui.add( this, 'preAddJoint' );
	this.gui.add( this, 'midAddJoint' );
	this.gui.add( this, 'postAddPrisJoint' );
	this.gui.add( this, 'postAddRevoJoint' );
	this.gui.add( this, 'postAddFixedJoint' );
	this.gui.add(this, 'createFloor').name("Add Box")

	this.gui.add( this, 'delete');
	this.gui.add( this, 'homeCameraView').name("Set Home Camera View");
	this.gui.add( this, 'resetCameraPos').name("Reset Camera View");

	const modeFolder = this.gui.addFolder( 'Mode' );
	modeFolder.add( this, 'select');
	modeFolder.add( this, 'position');
	modeFolder.add( this, 'rotation');
	modeFolder.add( this, 'scale');

    const uploadFolder = this.gui.addFolder( 'Upload Object' );
	uploadFolder.add( this, 'previewFile').name("Upload Mesh from local");
	uploadFolder.add(this.uploadInfo, 'uid')
	// uploadFolder.add( this, 'uploadObjaverse').name("Upload UID from Objaverse");
	uploadFolder.add( this, 'uploadObjaverseSeparate').name("Upload UID from Objaverse");

    const downloadFolder = this.gui.addFolder( 'Download Scene' );
	downloadFolder.add( this, 'downloadMesh' ).name("Download USDZ");

	const selectionFolder = this.gui.addFolder( 'Selected Object' );
	selectionFolder.add(this.display_info, 'name').listen().onChange(()=>{
		this.selected_mesh[0].name = this.display_info.name;
	})
	selectionFolder.add(this.display_info, 'rigid_body').listen().onChange(()=>{
		this.selected_mesh[0].userData.rigid_body = this.display_info.rigid_body;
	})
    selectionFolder.add(this.display_info, 'mass').listen().onChange(()=>{
		this.selected_mesh[0].userData.mass = this.display_info.mass;
	})
	selectionFolder.add(this.display_info, 'collider').listen().onChange(()=>{
		this.selected_mesh[0].userData.collider = this.display_info.collider;
	})

	const positionFolder = selectionFolder.addFolder( 'Positions' );
	positionFolder.add(this.display_info, 'position_x').listen().onChange(()=>{
		this.selected_mesh[0].position.x = this.display_info.position_x;
	})
	positionFolder.add(this.display_info, 'position_y').listen().onChange(()=>{
		this.selected_mesh[0].position.y = this.display_info.position_y;
	})
	positionFolder.add(this.display_info, 'position_z').listen().onChange(()=>{
		this.selected_mesh[0].position.z = this.display_info.position_z;
	})
	positionFolder.close()

	const rotationFolder = selectionFolder.addFolder( 'Rotations' );
	rotationFolder.add(this.display_info, 'rotation_x').listen().onChange(()=>{
		this.selected_mesh[0].rotation.x = this.display_info.rotation_x;
	})
	rotationFolder.add(this.display_info, 'rotation_y').listen().onChange(()=>{
		this.selected_mesh[0].rotation.y = this.display_info.rotation_y;
	})
	rotationFolder.add(this.display_info, 'rotation_z').listen().onChange(()=>{
		this.selected_mesh[0].rotation.z = this.display_info.rotation_z;
	})
	rotationFolder.close()

	const scaleFolder = selectionFolder.addFolder( 'Scales' );
	scaleFolder.add(this.display_info, 'scale_x').listen().onChange(()=>{
		this.selected_mesh[0].scale.x = this.display_info.scale_x;
	})
	scaleFolder.add(this.display_info, 'scale_y').listen().onChange(()=>{
		this.selected_mesh[0].scale.y = this.display_info.scale_y;
	})
	scaleFolder.add(this.display_info, 'scale_z').listen().onChange(()=>{
		this.selected_mesh[0].scale.z = this.display_info.scale_z;
	})
	scaleFolder.close()
	const jointFolder = selectionFolder.addFolder( 'Joints' );
	jointFolder.add(this.display_info, 'upperLimit').listen().onChange(()=>{
		this.joint_info.upperLimit = this.display_info.upperLimit;
        this.updateLine()
	})
    jointFolder.add(this.display_info, 'lowerLimit').listen().onChange(()=>{
		this.joint_info.lowerLimit = this.display_info.lowerLimit;
        this.updateLine()

	})

	window.addEventListener( 'resize', ()=> this.onWindowResize(), false );
    
    window.logTriangleDefinitions = logTriangleDefinitions;

	window.addEventListener( 'keydown', function ( e ) {

		switch ( e.code ) {

			case 'KeyW':
				this.transformControls.setMode( 'translate' );
				break;
			case 'KeyE':
				this.transformControls.setMode( 'rotate' );
				break;
			case 'KeyR':
				this.transformControls.setMode( 'scale' );
				break;

		}

	} );

    
    window.addEventListener('click', (event) => this.onWindowClicked(event))

	this.render();

    document.getElementById('myInput').addEventListener("change", (event) => {
        this.displayPreviewFile()
    });
  }


  treeUpdated(tree){
    console.log("tree updated", tree)
    this.treeData = tree
  }

  onWindowClicked(event) {
        console.log("clicked")
        console.log(this.treeData)
        if (event.target.tagName == 'CANVAS') {
            const clickMouse = new THREE.Vector2();
            // THREE RAYCASTER
            clickMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            clickMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
            const found = this.intersect(clickMouse);
            if (found.length > 0) {
                let check = false;
    
                for (let i = 0; i < found.length; i++){
                    if (found[i].object.userData.selectable) {
                        this.selected_mesh = [found[i].object]
                        console.log('found selected_mesh', this.selected_mesh)
                        check = true;
                        
                        break;
                    }
                }
                if (! check){
                    this.selected_mesh = [];
                }
                this.outlinePass.selectedObjects = this.selected_mesh;
                
            }
        }
    
        if (this.selected_mesh.length > 0 && this.transform_enabled) {
            
            // let middle = utils.getCenter(this.selected_mesh[0])
            let middle = new THREE.Vector3(0,0,0)
            this.transformControls.position.set(middle.x, middle.y, middle.z);
    
            this.transformControls.attach( this.selected_mesh[0] );

            console.log("Attach transform controls")
    
        } else {
            this.transformControls.detach();
        }
    
        if (this.selected_mesh.length > 0 && this.joint_enabled) {
            
            this.two_meshes.push(this.selected_mesh[0])
            if (this.two_meshes.length > 2) {
                this.two_meshes.shift()
            }
        }
        console.log("two meshes", this.two_meshes)
        console.log("selected mesh", this.selected_mesh)
  }

  intersect(pos) {
    this.raycaster.setFromCamera(pos, this.camera);
    return this.raycaster.intersectObjects(this.scene.children);
  }

  onWindowResize(){
    console.log("resize", this, this.camera)
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }
  render() {
    const startTime = window.performance.now();

	// update display info
	if ( this.selected_mesh.length > 0 ){
		this.display_info['name'] = this.selected_mesh[0].name
		this.display_info['position_x'] = utils.truncate(this.selected_mesh[0].position.x, 4)
		this.display_info['position_y'] = utils.truncate(this.selected_mesh[0].position.y, 4)
		this.display_info['position_z'] = utils.truncate(this.selected_mesh[0].position.z, 4)
		this.display_info['rotation_x'] = utils.truncate(this.selected_mesh[0].rotation.x, 4)
		this.display_info['rotation_y'] = utils.truncate(this.selected_mesh[0].rotation.y, 4)
		this.display_info['rotation_z'] = utils.truncate(this.selected_mesh[0].rotation.z, 4)
		this.display_info['scale_x'] = utils.truncate(this.selected_mesh[0].scale.x, 4)
		this.display_info['scale_y'] = utils.truncate(this.selected_mesh[0].scale.y, 4)
		this.display_info['scale_z'] = utils.truncate(this.selected_mesh[0].scale.z, 4)
		this.display_info['rigid_body'] = this.selected_mesh[0].userData.rigid_body
		this.display_info['mass'] = this.selected_mesh[0].userData.mass
		this.display_info['collider'] = this.selected_mesh[0].userData.collider

	} else{
		this.display_info['name'] = ''
		this.display_info['position_x'] = ''
		this.display_info['position_y'] = ''
		this.display_info['position_z'] = ''
		this.display_info['rotation_x'] = ''
		this.display_info['rotation_y'] = ''
		this.display_info['rotation_z'] = ''
		this.display_info['scale_x'] = ''
		this.display_info['scale_y'] = ''
		this.display_info['scale_z'] = ''
		this.display_info['rigid_body'] = false;
		this.display_info['mass'] = 0;
		this.display_info['collider'] = false;
	}
    this.display_info["upperLimit"] = this.joint_info.upperLimit
    this.display_info["lowerLimit"] = this.joint_info.lowerLimit

	//requestAnimationFrame( this.render );

	// renderer.render( scene, camera );
	this.composer.render( this.scene, this.camera );
	const deltaTime = window.performance.now() - startTime;
	//this.outputContainer.innerText = `${ deltaTime.toFixed( 3 ) }ms`;
  }

    preCut(){
        console.log("Precut selected mesh", this.selected_mesh)
        if (this.selected_mesh.length == 0) {
            console.log("Please first select a mesh!")
        } else {

            this.cut_selected = this.selected_mesh[0]
            this.position()
            if (!this.bounding_box){
                this.bounding_box = utils.create_object('bounding_box',this, this.cut_selected) // todo pass params here
                this.scene.add(this.bounding_box)
            }
        }
    }

    initializeMesh(mesh){
        mesh.userData.selectable = true;
        mesh.userData.rigid_body = true;
        mesh.userData.mass = 0.411;
        mesh.userData.collider = true;
        mesh.userData.joint_info = [];
        mesh.name = "Mesh_"+mesh.id;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.addNewMeshToTree(mesh)
    }

    initializeSite(site, mesh){
        site.userData.selectable = true;
        site.userData.rigid_body = true;
        site.userData.mass = 0.001;
        site.userData.collider = false; //todo fix
        site.userData.joint_info = [];
        site.name = "Site_"+mesh.id;
        site.castShadow = false;
        site.receiveShadow = false;
    }

    postCut(){
        const matrixworld = this.cut_selected.matrixWorld.clone()
        const quat = this.cut_selected.quaternion.clone()

        const bounding_matrix = 
        this.bounding_box.position.applyMatrix4( matrixworld.clone().invert())
        const trans = quat.clone()
        trans.setFromEuler(this.bounding_box.rotation)
        this.bounding_box.rotation.setFromQuaternion( trans.multiply(quat.clone().invert()));
        this.bounding_box.updateMatrix()
        this.bounding_box.updateMatrixWorld(true)
        // object.position = new Vector3(0,0,0)
        // object.rotation = new Euler(0,0,0)

        this.cut_selected.position.setX(0)
        this.cut_selected.position.setY(0)
        this.cut_selected.position.setZ(0)
        this.cut_selected.rotation.setFromVector3(new Vector3(0,0,0))
        this.cut_selected.updateMatrix()
        this.cut_selected.updateMatrixWorld(true)

        this.removeFromTree(this.cut_selected.id)
        this.scene.remove(this.cut_selected, this.bounding_box);

        this.selected_mesh = [];
        this.transformControls.detach();
        let mesh1, mesh2;
        
        mesh1 = this.csgEvaluator.evaluate( this.cut_selected, this.bounding_box, SUBTRACTION );
        mesh1.material = this.cut_selected.material.clone();
        this.initializeMesh(mesh1)

        mesh2 = this.csgEvaluator.evaluate( this.cut_selected, this.bounding_box, INTERSECTION );
        mesh2.material = this.cut_selected.material.clone();
        this.initializeMesh(mesh2)

        mesh1.position.applyMatrix4( matrixworld.clone())
        mesh1.rotation.setFromQuaternion(quat.clone());

        mesh2.position.applyMatrix4( matrixworld.clone())
        mesh2.rotation.setFromQuaternion(quat.clone());

        this.scene.add(mesh1)
        this.scene.add(mesh2);
        this.bounding_box = null
    }

    preAddSite(){
        if (this.selected_mesh.length > 0){
            this.site = utils.create_object('sphere', this, this.selected_mesh[0]) //TODO: pass params
            
            this.initializeSite(this.site, this.selected_mesh[0])
            this.scene.add(this.site)
            this.site.userData.parent_id = this.selected_mesh[0].id
        }else{
            console.log("Warning please select a mesh")
        }
    }

    findMesh(id){
	
        let foundObj;
        this.scene.traverseVisible( ( object ) => {
            if (object.id === id){
                foundObj = object
    
            }
        })
        return foundObj
    }

    postAddSite(){
        let parent_mesh = this.findMesh(this.site.userData.parent_id)
        console.log("post add site", parent_mesh, this.site.userData.parent_id)
        this.addNewSiteToTree(this.site, parent_mesh)

        let child_mesh = this.site

        let joint_info = {}
        joint_info['body0'] = this.getTreePath(parent_mesh.id)
        joint_info['body1'] = this.getTreePath(child_mesh.id)

        joint_info['breakForce'] = 'inf'
        joint_info['breakTorque'] = 'inf'

        // TODO: fix sites
        let pos0 = child_mesh.position.clone().applyMatrix4( parent_mesh.matrixWorld.clone().invert()) //[pos[0] - parent_mesh.position.x, pos[1] - parent_mesh.position.y, pos[2] - parent_mesh.position.z]

        joint_info['localPos0'] = pos0
        joint_info['localPos1'] = new THREE.Vector3(0,0,0)//parent_mesh.position.clone()

        joint_info['localRot0'] = child_mesh.quaternion.clone()
        joint_info['localRot1'] = parent_mesh.quaternion.clone()

        joint_info["joint_type"] = "FixedJoint"

        console.log(joint_info)
        child_mesh.userData.joint_info.push(joint_info)
        this.site.material.opacity = 0
        this.site.userData.selectable = false
        this.site = null;
        this.transformControls.detach()
    }

    preAddJoint(){
        this.two_meshes = []
        this.joint_enabled = true;
    }

    createLine(cylinder){
        const material1 = new THREE.LineBasicMaterial({
            color: 0x0000ff
        });
        const material2 = new THREE.LineBasicMaterial({
            color: 0xff0000
        });
        const center = new THREE.Vector3(0,0,0);
        const z_axis =  new THREE.Vector3( 0, 1, 0 )
        const x_axis =  new THREE.Vector3( 1, 0, 0 )
        let pi = 3.14159265359
        const joint_upper = x_axis.clone().applyAxisAngle(z_axis.clone(), this.joint_info.upperLimit*pi/180)
        console.log("joint upper", joint_upper)
        const joint_lower = x_axis.clone().applyAxisAngle(z_axis.clone(), this.joint_info.lowerLimit*pi/180)
        const points1 = [];
        const points2 = [];
        points1.push(center.clone().applyMatrix4( cylinder.matrixWorld.clone()) );
        points1.push(z_axis.clone().applyMatrix4( cylinder.matrixWorld.clone()))
        points1.push(center.clone().applyMatrix4( cylinder.matrixWorld.clone()) );
        points1.push(x_axis.clone().applyMatrix4( cylinder.matrixWorld.clone()))
        points2.push(center.clone().applyMatrix4( cylinder.matrixWorld.clone()) );
        points2.push(joint_upper.clone().applyMatrix4( cylinder.matrixWorld.clone()))
        points2.push(center.clone().applyMatrix4( cylinder.matrixWorld.clone()) );
        points2.push(joint_lower.applyMatrix4( cylinder.matrixWorld.clone()))
        
        const geometry1 = new THREE.BufferGeometry().setFromPoints( points1 );
        const geometry2 = new THREE.BufferGeometry().setFromPoints( points2 );
        
        const line1 = new THREE.Line( geometry1, material1 );
        const line2 = new THREE.Line( geometry2, material2 );

        
        return [line1, line2]
    }


    updateLine(){
        if (this.line){
            this.line.forEach(line => this.scene.remove(line))
            this.line = this.createLine(this.cylinder)
            this.line.forEach(line => this.scene.add(line))
        }
    }
    midAddJoint(){
        if (this.two_meshes.length != 2) {
            console.log("Please select two meshes!")
        } else {

            this.joint_enabled = false;
            this.position()
            if (!this.cylinder){
                this.cylinder = utils.create_object('cylinder', this, this.two_meshes[0]) //TODO: pass params
            }
            if (this.line){

                this.line.forEach(line => this.scene.remove(line))

            }
            this.scene.add(this.cylinder)

            this.line = this.createLine(this.cylinder)
            this.line.forEach(line => this.scene.add(line))

        }
    }

    postAddPrisJoint(){
        let mesh0 = this.two_meshes[0]
        let mesh1 = this.two_meshes[1]
        let joint_matrix = this.cylinder.matrixWorld
        console.log("cylinder", this.cylinder, joint_matrix)
        
        let joint_info = {}
        joint_info['id'] = mesh0.id+"/"+mesh1.id
        joint_info['body0'] = this.getTreePath(mesh0.id)
        joint_info['body1'] = this.getTreePath(mesh1.id)
        console.log(joint_info)
        joint_info['breakForce'] = 'inf'
        joint_info['breakTorque'] = 'inf'

        let local_frame_mesh0 = mesh0.matrixWorld.clone().invert().multiply(joint_matrix.clone())
        let posmesh0 = new THREE.Vector3()
        let quatmesh0 = new THREE.Quaternion()
        let scalemesh0 = new THREE.Vector3()
        local_frame_mesh0.decompose(posmesh0, quatmesh0, scalemesh0)

        let local_frame_mesh1 = mesh1.matrixWorld.clone().invert().multiply(joint_matrix.clone())
        let posmesh1 = new THREE.Vector3()
        let quatmesh1 = new THREE.Quaternion()
        let scalemesh1 = new THREE.Vector3()
        local_frame_mesh1.decompose(posmesh1, quatmesh1, scalemesh1)

        joint_info['localPos0'] = posmesh0
        joint_info['localPos1'] = posmesh1


        joint_info['localRot0'] = quatmesh0
        joint_info['localRot1'] = quatmesh1

        joint_info["lowerLimit"] = -this.cylinder.scale.y/2
        joint_info["upperLimit"] = this.cylinder.scale.y/2
        joint_info["friction"] = 0.2

        joint_info["joint_type"] = "PrismaticJoint"

        joint_info["axis"] = "Y"

        console.log(joint_info)
        mesh0.userData.joint_info.push(joint_info)

        this.addNewJointToTree(mesh0, joint_info)
        this.scene.remove(this.cylinder)
        this.two_meshes = []
        this.selected_mesh = []
        this.transformControls.detach();
        this.cylinder = null
        this.line.forEach(line => this.scene.remove(line))

        this.line = null
    }

    postAddRevoJoint(){
        let mesh0 = this.two_meshes[0]
        let mesh1 = this.two_meshes[1]

        let joint_matrix = this.cylinder.matrixWorld
        console.log("Adding joints")
        console.log(joint_matrix)
        console.log(mesh0, mesh1)
        let joint_info = {}
        joint_info['body0'] = this.getTreePath(mesh0.id)
        joint_info['body1'] = this.getTreePath(mesh1.id)

        joint_info['breakForce'] = 'inf'
        joint_info['breakTorque'] = 'inf'
        let local_frame_mesh0 = mesh0.matrixWorld.clone().invert().multiply(joint_matrix.clone())
        let posmesh0 = new THREE.Vector3()
        let quatmesh0 = new THREE.Quaternion()
        let scalemesh0 = new THREE.Vector3()
        local_frame_mesh0.decompose(posmesh0, quatmesh0, scalemesh0)

        let local_frame_mesh1 = mesh1.matrixWorld.clone().invert().multiply(joint_matrix.clone())
        let posmesh1 = new THREE.Vector3()
        let quatmesh1 = new THREE.Quaternion()
        let scalemesh1 = new THREE.Vector3()
        local_frame_mesh1.decompose(posmesh1, quatmesh1, scalemesh1)
        
        
        joint_info['localPos0'] = posmesh0
        joint_info['localPos1'] = posmesh1

        console.log("joint info after adding local", joint_info)

        console.log("joint info rots", joint_info)
        joint_info['localRot0'] = quatmesh0

        joint_info['localRot1'] = quatmesh1

        joint_info["lowerLimit"] = this.joint_info.lowerLimit //"-90"
        joint_info["upperLimit"] = this.joint_info.upperLimit //"90"
        joint_info["friction"] = "0.2"

        joint_info["joint_type"] = "RevoluteJoint"

        joint_info["axis"] = "Y"

        console.log(joint_info)
        mesh0.userData.joint_info.push(joint_info)

        this.addNewJointToTree(mesh0, joint_info)
        this.scene.remove(this.cylinder)
        this.cylinder = null
        this.two_meshes = []
        this.selected_mesh = []
        this.transformControls.detach();
        this.line.forEach(line => this.scene.remove(line))
        this.line = null
    }

    postAddFixedJoint(){
        let joint_matrix;
        if (this.cylinder){
            joint_matrix = this.cylinder.matrixWorld
        }else{
            joint_matrix = new THREE.Matrix4()
        }
        

        let mesh0 = this.two_meshes[0]
        console.log("add fixed joint", mesh0)

        let joint_info = {}
        joint_info['body1'] = this.getTreePath(mesh0.id)

        joint_info['breakForce'] = 'inf'
        joint_info['breakTorque'] = 'inf'

        let local_frame_mesh0 = mesh0.matrixWorld.clone().invert().multiply(joint_matrix.clone())
        let posmesh0 = new THREE.Vector3()
        let quatmesh0 = new THREE.Quaternion()
        let scalemesh0 = new THREE.Vector3()
        local_frame_mesh0.decompose(posmesh0, quatmesh0, scalemesh0)

        joint_info['localPos0'] = posmesh0//pos.clone().add( parent_mesh.position.clone().negate()) //[pos[0] - parent_mesh.position.x, pos[1] - parent_mesh.position.y, pos[2] - parent_mesh.position.z]//parent_mesh.position.clone()
    
        joint_info['localRot0'] = quatmesh0 // parent_mesh.quaternion.clone()

        joint_info["joint_type"] = "FixedJoint"

        if (this.two_meshes.length == 2){
            let mesh1 = this.two_meshes[1]
            let local_frame_mesh1 = mesh1.matrixWorld.clone().invert().multiply(joint_matrix.clone())
            let posmesh1 = new THREE.Vector3()
            let quatmesh1 = new THREE.Quaternion()
            let scalemesh1 = new THREE.Vector3()
            local_frame_mesh1.decompose(posmesh1, quatmesh1, scalemesh1)

            joint_info['body0'] = this.getTreePath(mesh1.id)
            
            joint_info['localPos1'] = posmesh1//pos.clone().add(child_mesh.position.clone().negate())//[pos[0] - child_mesh.position.x, pos[1] - child_mesh.position.y, pos[2] - child_mesh.position.z] // child_mesh.position.clone()

            joint_info['localRot1'] = quatmesh1// child_mesh.quaternion.clone()

        }

        console.log(joint_info)
        mesh0.userData.joint_info.push(joint_info)

        this.addNewJointToTree(mesh0, joint_info)
        this.scene.remove(this.cylinder)
        this.cylinder = null
        this.two_meshes = []
        this.selected_mesh = []
        this.transformControls.detach();
        if (this.line){
            this.line.forEach(line => this.scene.remove(line))
        }

        this.line = null
    }

    async downloadMesh(){
        const exporter = new USDZExporter();
        const arraybuffer = await exporter.parse( this.scene, this.treeData );
        const blob = new Blob( [ arraybuffer ], { type: 'application/octet-stream' } );

        console.log("downloading mesh")

        const aElement = document.createElement('a');
        aElement.setAttribute('download', "scene.usdz");
        const href = URL.createObjectURL(blob);
        aElement.href = href;
        aElement.setAttribute('target', '_blank');
        aElement.click();
        URL.revokeObjectURL(href);
    }


    async select(){
        this.transform_enabled = false;
        console.log("cursor mode")
    }

    async position(){
        this.transformControls.setMode("translate")
        this.transform_enabled = true;
        console.log("position mode")
    }

    async rotation(){
        this.transformControls.setMode("rotate")
        this.transform_enabled = true;
        console.log("rotation mode")
    }

    async scale(){
        this.transformControls.setMode("scale")
        this.transform_enabled = true;
        console.log("scale mode")
    }

    animate() {
        // NOTE: Window is implied.
        // requestAnimationFrame(this.animate.bind(this));
        window.requestAnimationFrame(this.animate.bind(this));
        this.render();
        this.controls.update();
    }

    delete(){
        if (this.selected_mesh.length == 0) {
            console.log("Please first select a mesh!")
        } else {
            this.removeFromTree(this.selected_mesh[0].id)
            this.scene.remove(this.selected_mesh[0])
            
            if (this.selected_mesh[0] === this.cylinder){
                this.cylinder = null
            }

            if (this.selected_mesh[0] === this.bounding_box){
                this.bounding_box = null
            }
            this.selected_mesh = []
            this.transformControls.detach();
        }
    }

    resetCameraPos(){
        this.controls.reset()
    }

    homeCameraView(){
        this.controls.saveState()
    }
    async uploadTable(){
        const path = "https://raw.githubusercontent.com/MarcelTorne/GLTFModels/main/table.glb"
        
        const table = await this.uploadGlbFile(path)
        console.log(table)
        table.scale.x *= 3;
        table.scale.y *= 3;
        table.scale.z *= 3;
        table.position.y -= 0.58
        return table
    }
    async uploadFranka(){
        const path = "https://raw.githubusercontent.com/MarcelTorne/GLTFModels/main/franka.glb";
        let obj;
        let model;
        obj = await new GLTFLoader()
        .setMeshoptDecoder( MeshoptDecoder )
        .loadAsync(path)    
        let added_obj = obj.scene.children[0].children[0]
        console.log(added_obj)
        this.scene.add( added_obj);
    }
    async uploadObjaverse(joint_parts = true){
        // Get paths file
        let paths = await fetch('https://raw.githubusercontent.com/MarcelTorne/GLTFModels/main/object-paths.json')
        paths = await paths.json()
        console.log("paths", paths)
        // const path = "glbs/000-023/8476c4170df24cf5bbe6967222d1a42d.glb"

        const path = "https://huggingface.co/datasets/allenai/objaverse/resolve/main/" + paths[this.uploadInfo.uid]
        const meshes = await this.uploadGlbFileObjaverse(path, joint_parts)
        // let pi = 3.14159265359

        // meshes.forEach(mesh => {
        //     mesh.scale.x = 0.2
        //     mesh.scale.y = 0.2
        //     mesh.scale.z = 0.2
        //     mesh.rotation.x = -pi/2
        //     mesh.updateMatrixWorld()
        // })

    }
    async uploadObjaverseSeparate(){
        return this.uploadObjaverse(false)
    }

    async setUpScene(){
        let table = await this.uploadTable()
        this.two_meshes = [table]
        this.postAddFixedJoint()
        this.uploadFranka()
        this.two_meshes = []
    }

    uploadGlbFileObjaverseRec(model, acc_position, acc_quaternion, acc_scale, acc_matrixWorld, joint_parts = false){
        console.log("recursing on model", model, acc_position, acc_scale)
        if ("geometry" in model){ // Leaf
            console.log("geometry", model)
            model.receiveShadow = true;
            model.castShadow = true;
            
            const geometry = model.geometry.clone();
            geometry.computeVertexNormals();
            const material = model.material.clone();
            let brush1 = new Brush( geometry.clone(), material );
            brush1.updateMatrixWorld()

            console.log("setting values", acc_position, acc_scale, acc_quaternion, acc_matrixWorld)
            brush1.position.add(acc_position)
            brush1.scale.multiply(acc_scale)
            brush1.quaternion.multiply(acc_quaternion)
            // brush1.matrix.multiply(acc_matrixWorld)
            // let new_matrix = acc_matrixWorld.clone().multiply(brush1.matrix)
            // brush1.position.setFromMatrixPosition(new_matrix)
            // brush1.scale.setFromMatrixScale(new_matrix)
            // brush1.quaternion.setFromRotationMatrix(new_matrix)
            brush1.updateMatrixWorld()

            console.log("final matrix", acc_matrixWorld)
            this.initializeMesh(brush1)
            this.scene.add( brush1 );

            return [brush1]
            
        } else {
            let children = model.children
            let all_meshes = []
            const new_position = acc_position.add(model.position.clone().multiply(model.scale))
            const new_scale = acc_scale.multiply(model.scale)
            const new_quaternion = acc_quaternion.multiply(model.quaternion)
            // const new_matrixWorld = acc_matrixWorld.multiply(model.matrix)
            children.forEach(child => {
                let child_meshes = this.uploadGlbFileObjaverseRec(child, new_position.clone(), new_quaternion.clone(), new_scale.clone(),"")
                // let child_meshes = this.uploadGlbFileObjaverseRec(child, "", "","", new_matrixWorld.clone())
                console.log("child meshes", child_meshes)
                child_meshes.forEach(mesh => {
                    all_meshes.push(mesh)
                })
            })
            return all_meshes
        }
    }


    async uploadGlbFileObjaverse(path, joint_parts=true){
        let obj;
        let model;
        obj = await new GLTFLoader()
        .setMeshoptDecoder( MeshoptDecoder )
        .loadAsync(path)
        console.log("uploading glb", obj)

        let scene = obj.scene
        let scale = scene.scale.clone()
        let position = scene.position.clone()
        let quaternion = scene.quaternion.clone()
        let matrixWorld = scene.matrix.clone()
        return this.uploadGlbFileObjaverseRec(scene, position, quaternion, scale, matrixWorld)
    }


    async uploadGlbFileObjaverseOld(path, joint_parts=true){
        let obj;
        let model;
        obj = await new GLTFLoader()
        .setMeshoptDecoder( MeshoptDecoder )
        .loadAsync(path)
        console.log("uploading glb", obj)

        let parent = obj.scene
  
        if ("geometry" in parent.children[0]){
            let model = parent.children[0]
            console.log(model)
            model.receiveShadow = true;
            model.castShadow = true;
            
            const geometry = model.geometry.clone();
            geometry.computeVertexNormals();
            const material = model.material.clone();
            let brush1 = new Brush( geometry.clone(), material );
            brush1.updateMatrixWorld()
            
            this.initializeMesh(brush1)
            
            this.scene.add( brush1 );
            return brush1
        }
        console.log("parent here", parent)
        while  (!("geometry" in parent.children[0].children[0])){
            parent = parent.children[0]
            console.log("inside", parent)
        }

        let brushes = []
        console.log("parent", parent)
        let i = 0
        let full_mesh = ""

        parent.children.forEach( child => {
            console.log("trying to add model", child)
            child.children.forEach( model => {
                console.log("Add model", model)
                // model = child.children[0]
                if ("geometry" in model){
                    console.log(model)
                    model.receiveShadow = true;
                    model.castShadow = true;
                    
                    const geometry = model.geometry.clone();
                    geometry.computeVertexNormals();
                    const material = model.material.clone();
                    let brush1 = new Brush( geometry.clone(), material );
                    brush1.updateMatrixWorld()
                    
                    // this.initializeMesh(brush1)
                    // this.scene.add( brush1 );
        
                    if (!joint_parts){
                        this.initializeMesh(brush1)
                    
                        this.scene.add( brush1 );
                        brushes.push(brush1)
                    }else{
                        this.initializeMesh(brush1, i)
                        this.scene.add( brush1);

                        if (i === 0){
                            i = 1
                            full_mesh = brush1

                            console.log("Starting full mesh")
                        } else{
                            i= i + 1
                            console.log("Union meshes full mesh", full_mesh, brush1)
                            console.log("full mesh", full_mesh)
                            console.log("brush1", brush1)
                            // brush1.prepareGeometry()
                            // const targetGeometry = brush1.geometry;
                            // const aAttributes = brush1.geometry.attributes;
                            // console.log("attributes", aAttributes)
                            // let attributes = [ 'position', 'uv', 'normal' ];
                            // for ( let i = 0, l = attributes.length; i < l; i ++ ) {
                    
                            //     const key = attributes[ i ];
                            //     const attr = aAttributes[ key ];
                            //     console.log(attr.array.constructor)
                            //     // attributeData.initializeArray( key, attr.array.constructor );
                    
                            // }



                            
                            full_mesh = this.csgEvaluator.evaluate( full_mesh, brush1, INTERSECTION );
                            full_mesh.material = brush1.material.clone();
                                
                            this.initializeMesh(full_mesh, i )
                            this.scene.add( full_mesh);
                            i+=1
                        }
                    }
                }
            })
        })
        if (!joint_parts){
            return brushes
        }

        return [full_mesh]
    }

    async uploadGlbFile(path, joint_parts=true){
        let obj;
        let model;
        obj = await new GLTFLoader()
        .setMeshoptDecoder( MeshoptDecoder )
        .loadAsync(path)
        console.log("uploading glb", obj)

        let parent = obj.scene
  
        if ("geometry" in parent.children[0]){
            let model = parent.children[0]
            console.log(model)
            model.receiveShadow = true;
            model.castShadow = true;
            
            const geometry = model.geometry.clone();
            geometry.computeVertexNormals();
            const material = model.material.clone();
            let brush1 = new Brush( geometry.clone(), material );
            brush1.updateMatrixWorld()
            
            this.initializeMesh(brush1)
            
            this.scene.add( brush1 );
            return brush1
        }
        console.log("parent here", parent)
        while  (!("geometry" in parent.children[0].children[0])){
            parent = parent.children[0]
            console.log("inside", parent)
        }

        let brushes = []
        console.log("parent", parent)
        let i = 0
        let full_mesh = ""

        parent.children.forEach( child => {
            console.log("trying to add model", child)
            child.children.forEach(model => {
                if ("geometry" in model){
                    console.log(model)
                    model.receiveShadow = true;
                    model.castShadow = true;
                    
                    const geometry = model.geometry.clone();
                    geometry.computeVertexNormals();
                    const material = model.material.clone();
                    let brush1 = new Brush( geometry.clone(), material );
                    brush1.updateMatrixWorld()
                    
                    // this.initializeMesh(brush1)
                    // this.scene.add( brush1 );
        
                    if (!joint_parts){
                        this.initializeMesh(brush1)
                    
                        this.scene.add( brush1 );
                        brushes.push(brush1)
                    }else{
                        if (i == 0){
                            i = 1
                            full_mesh = brush1
                            console.log("Starting full mesh")
                        } else{
                            i=1
                            console.log("Union meshes full mesh", full_mesh, brush1)
    
                            full_mesh = this.csgEvaluator.evaluate( full_mesh, brush1, ADDITION );
                            full_mesh.material = brush1.material.clone();
                        }
    
                    }
                }
            })
            
            

        })
        if (joint_parts){
            this.initializeMesh(full_mesh)
            this.scene.add( full_mesh );
        }





        return full_mesh
    }
    addNewMeshToTree(mesh){
        this.treeData.push({id: "Xform_"+mesh.id, parent: 0, droppable: true, text:"Xform_"+mesh.id})
        this.treeData.push({id: mesh.id, parent: "Xform_"+mesh.id, text:"Object_"+mesh.id})
        this.setTreeData([...this.treeData])
    }

    addNewSiteToTree(site, mesh){
        this.treeData.push({id: "SiteXform_"+site.id, parent: 0, droppable: true, text:"SiteXform_"+site.id})
        this.treeData.push({id: site.id, parent: "SiteXform_"+site.id, text:"Object_"+site.id})
        this.setTreeData([...this.treeData])
    }
    removeFromTree(id){
        const toRemoveIdx = this.treeData.findIndex((element) => element.id == id)
        console.log("Index to remove is", toRemoveIdx)
        const parentIdx = this.treeData[toRemoveIdx].parent
        const num_childs = this.treeData.filter((element) => element.id == parentIdx).length
        this.treeData.splice(toRemoveIdx, 1)
        if (num_childs == 1){
            this.removeFromTree(parentIdx)
        }
        this.setTreeData([...this.treeData])

    }
    getTreePath(id){
        console.log("Getting tree path", id)
        const idx_id = this.treeData.findIndex((element) => element.id == id)
        console.log("Getting tree path idx", idx_id)

        const info = this.treeData[idx_id]
        console.log("Getting tree path info", info)
        const path = `</World/${info.parent}/${info.text}>`
        return path
      }
    addNewJointToTree(parent_mesh, joint_info){
        this.treeData.push({id: joint_info.id, parent: "Xform"+parent_mesh.id, text:joint_info.joint_type+":"+joint_info.id})
        this.setTreeData([...this.treeData])
    }
    async uploadObjFile(pathObj, pathMtl){
        let materials = await new MTLLoader()
        .loadAsync(pathMtl)
        materials.preload()
        
        let objLoader = new OBJLoader();
        objLoader.setMaterials(materials)
        let model = await objLoader.loadAsync(pathObj);
        model = model.children[0];
        console.log(materials)
        console.log(model)
        console.log("hi")
        model.receiveShadow = true;
        model.castShadow = true;

        const geometry = model.geometry.clone();
        geometry.computeVertexNormals();
        console.log("hi2")
        const material = model.material.clone();
        console.log("prototype", material.prototype)

        console.log(material)
        const material2 = new THREE.MeshStandardMaterial(material)
        let brush1 = new Brush( geometry.clone(), material);
        brush1.updateMatrixWorld()
        
        this.initializeMesh(brush1)
        
        this.scene.add( brush1 );
        return brush1
    }

    previewFile() {
        document.getElementById('myInput').click();
    }

    displayPreviewFile(){
        const preview = document.querySelector("img");
        const file = document.querySelector("input[type=file]").files[0];
        const url = URL.createObjectURL(file)
        console.log("url",url)
        this.uploadGlbFile(url, false)
    }
    createFloor(){
        let floor = new Brush( new THREE.BoxGeometry(), new THREE.MeshStandardMaterial() );
        floor.material.side = THREE.DoubleSide;
        floor.material.roughness = 0.25;
        floor.receiveShadow = true;
        this.initializeMesh(floor)

        this.scene.add(floor)
    }
}