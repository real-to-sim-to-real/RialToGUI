import { Vector3 } from 'three';
import * as fflate from 'three/examples/jsm/libs/fflate.module.js';

class USDZExporter {

	async parse( scene, treeData ) {

		const files = {};
		const modelFileName = 'model.usda';

		// model file should be first in USDZ archive so we init it here
		files[ modelFileName ] = null;

		let output = buildHeader();

		const materials = {};
		const textures = {};



		// iterate over tree 
		output += getXformTree(0, treeData, materials, files, scene, textures)

		console.log(output)
		files[ modelFileName ] = fflate.strToU8( output );
		output = null;

		for ( const id in textures ) {

			const texture = textures[ id ];
			const color = id.split( '_' )[ 1 ];
			const isRGBA = texture.format === 1023;

			const canvas = imageToCanvas( texture.image, color );
			const blob = await new Promise( resolve => canvas.toBlob( resolve, isRGBA ? 'image/png' : 'image/jpeg', 1 ) );

			files[ `textures/Texture_${ id }.${ isRGBA ? 'png' : 'jpg' }` ] = new Uint8Array( await blob.arrayBuffer() );

		}

		// 64 byte alignment
		// https://github.com/101arrowz/fflate/issues/39#issuecomment-777263109

		let offset = 0;

		for ( const filename in files ) {

			const file = files[ filename ];
			const headerSize = 34 + filename.length;

			offset += headerSize;

			const offsetMod64 = offset & 63;

			if ( offsetMod64 !== 4 ) {

				const padLength = 64 - offsetMod64;
				const padding = new Uint8Array( padLength );

				files[ filename ] = [ file, { extra: { 12345: padding } } ];

			}

			offset = file.length;

		}


		return fflate.zipSync( files, { level: 0 } );

	}

}

function getXformTree(currentId, treeData, materials, files, scene, textures){
	let entry; 
	let children;
	let object;
	let output = "";

	console.log("get xform tree", currentId)
	if (currentId === 0){
		output += `def Xform "World"(
			prepend apiSchemas = ["PhysicsArticulationRootAPI", "PhysxArticulationAPI"] 
		){
			matrix4d xformOp:transform = ( (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1) )
			uniform token[] xformOpOrder = ["xformOp:transform"]
` // TODO: check if we really want world to be physics artifulation root api, I think it could be each sub xform
		children = findTreeChildren(0, treeData)

		for (let i = 0; i < children.length; i++){
			entry = children[i]
			output += getXformTree(entry.id, treeData, materials, files, scene, textures)
		}

		output += buildMaterials( materials, textures );


		output += `}
`
		return output
	}

	let currentEntry = findTreeEntry(currentId, treeData)

	if (!currentEntry.droppable){ // Leaf
		object = findObject(currentId, scene)
		console.log("object found", currentId, object)
		return getMeshString(object, materials, files, scene)
	} else{ // Node

		let children = findTreeChildren(currentId, treeData)

		if (children.length === 0){
			return ""
		}

		output += `def Xform "${currentEntry.text}"(){
			matrix4d xformOp:transform = ( (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1) )
			uniform token[] xformOpOrder = ["xformOp:transform"]
`
		for (let i = 0; i < children.length; i++){
			entry = children[i]
			output += getXformTree(entry.id, treeData, materials, files, scene, textures)
		}

		output += `}
`
	}
	return output
}

function findTreeChildren(currentId, treeData){
	let children = [];
	let entry;

	for (let i = 0; i < treeData.length; i++){
		entry = treeData[i]
		if (entry.parent === currentId){
			children.push(entry)
		}
	}

	return children
}

function findTreeEntry(id, treeData){
	let entry;

	for (let i = 0; i < treeData.length; i++){
		entry = treeData[i]
		if (entry.id === id){
			return entry
		}
	}
}

function findObject(id, scene){
	
	let foundObj;
	scene.traverseVisible( ( object ) => {
		if (object.id === id){
			foundObj = object

		}
	})
	return foundObj
}

function getMeshString(object, materials, files){
	if (object){
		if ( object.isMesh ) {

			if ( object.material.isMeshStandardMaterial ) {
				// TODO: RESET OBJECT POSITION AND ORIENTATION
				const prev_pos = object.position.clone()
				const prev_rot = object.rotation.clone()

				// object.position = new Vector3(0,0,0)
				// object.rotation = new Euler(0,0,0)

				object.position.setX(0)
				object.position.setY(0)
				object.position.setZ(0)
				object.rotation.setFromVector3(new Vector3(0,0,0))


				const geometry = object.geometry;
				const material = object.material;
				let meshObject = ""
	
				const geometryFileName = 'geometries/Geometry_' + geometry.id + '.usd';
	
				if ( ! ( geometryFileName in files ) ) {
	
					meshObject = buildMeshObject( geometry );
					files[ geometryFileName ] = buildUSDFileAsString( meshObject );
	
				}
	
				if ( ! ( material.uuid in materials ) ) {
	
					materials[ material.uuid ] = material;
	
				}

				object.position.setX(prev_pos.x)
				object.position.setY(prev_pos.y)
				object.position.setZ(prev_pos.z)
				object.rotation.setFromVector3(prev_rot)

	
				return buildXform( object, geometry, material );
	
			} else {
	
				console.warn( 'THREE.USDZExporter: Unsupported material type (USDZ only supports MeshStandardMaterial)', object );
	
			}
		}

	}

	return ""
	
}

function imageToCanvas( image, color ) {

	if ( ( typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement ) ||
		( typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement ) ||
		( typeof OffscreenCanvas !== 'undefined' && image instanceof OffscreenCanvas ) ||
		( typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap ) ) {

		const scale = 1024 / Math.max( image.width, image.height );

		const canvas = document.createElement( 'canvas' );
		canvas.width = image.width * Math.min( 1, scale );
		canvas.height = image.height * Math.min( 1, scale );

		const context = canvas.getContext( '2d' );
		context.drawImage( image, 0, 0, canvas.width, canvas.height );

		if ( color !== undefined ) {

			const hex = parseInt( color, 16 );

			const r = ( hex >> 16 & 255 ) / 255;
			const g = ( hex >> 8 & 255 ) / 255;
			const b = ( hex & 255 ) / 255;

			const imagedata = context.getImageData( 0, 0, canvas.width, canvas.height );
			const data = imagedata.data;

			for ( let i = 0; i < data.length; i += 4 ) {

				data[ i + 0 ] = data[ i + 0 ] * r;
				data[ i + 1 ] = data[ i + 1 ] * g;
				data[ i + 2 ] = data[ i + 2 ] * b;

			}

			context.putImageData( imagedata, 0, 0 );

		}

		return canvas;

	}

}

//

const PRECISION = 7;

function buildHeader() {

	return `#usda 1.0
(
    customLayerData = {
        string creator = "Three.js USDZExporter"
    }
    metersPerUnit = 1
    upAxis = "Y"
	defaultPrim = "World"
)

`;

}

function buildUSDFileAsString( dataToInsert ) {

	let output = buildHeader();
	output += dataToInsert;
	return fflate.strToU8( output );

}

// Xform

function buildJoint(joint_data){
    let joint_info = ""
	if (joint_data.joint_type === "FixedJoint") {
		if ("body0" in joint_data && joint_data.body0!==joint_data.body1){
			joint_info += `
				def Physics${joint_data.joint_type} "${joint_data.joint_type}"(
					prepend apiSchemas = ["PhysxLimitAPI:linear", "PhysxJointAPI"]
				)
				{
					rel physics:body0 = ${joint_data.body0}
					rel physics:body1 = ${joint_data.body1}
					float physics:breakForce = ${joint_data.breakForce}
					float physics:breakTorque = ${joint_data.breakTorque}
					point3f physics:localPos0 = (${joint_data.localPos0.x}, ${joint_data.localPos0.y}, ${joint_data.localPos0.z})
					point3f physics:localPos1 = (${joint_data.localPos1.x}, ${joint_data.localPos1.y}, ${joint_data.localPos1.z})
					quatf physics:localRot0 = (${joint_data.localRot0.w}, ${joint_data.localRot0.x}, ${joint_data.localRot0.y}, ${joint_data.localRot0.z})
					quatf physics:localRot1 = (${joint_data.localRot1.w}, ${joint_data.localRot1.x}, ${joint_data.localRot1.y}, ${joint_data.localRot1.z})
				}
				`
		}else{
			joint_info += `
			def Physics${joint_data.joint_type} "${joint_data.joint_type}"(
				prepend apiSchemas = ["PhysxLimitAPI:linear", "PhysxJointAPI"]
			)
			{
				rel physics:body1 = ${joint_data.body1}
				float physics:breakForce = ${joint_data.breakForce}
				float physics:breakTorque = ${joint_data.breakTorque}
				point3f physics:localPos0 = (${joint_data.localPos0.x}, ${joint_data.localPos0.y}, ${joint_data.localPos0.z})
				point3f physics:localPos1 = (0,0,0)
				quatf physics:localRot0 = (${joint_data.localRot0.w}, ${joint_data.localRot0.x}, ${joint_data.localRot0.y}, ${joint_data.localRot0.z})
				quatf physics:localRot1 = (1,0,0,0)
			}
			`
		}
	}else{
		joint_info += `
		def Physics${joint_data.joint_type} "${joint_data.joint_type}"(
			prepend apiSchemas = ["PhysxLimitAPI:linear", "PhysxJointAPI"]
		)
		{
			uniform token physics:axis = "${joint_data.axis}"
			rel physics:body0 = ${joint_data.body0}
			rel physics:body1 = ${joint_data.body1}
			float physics:breakForce = ${joint_data.breakForce}
			float physics:breakTorque = ${joint_data.breakTorque}
			point3f physics:localPos0 = (${joint_data.localPos0.x}, ${joint_data.localPos0.y}, ${joint_data.localPos0.z})
			point3f physics:localPos1 = (${joint_data.localPos1.x}, ${joint_data.localPos1.y}, ${joint_data.localPos1.z})
			quatf physics:localRot0 = (${joint_data.localRot0.w}, ${joint_data.localRot0.x}, ${joint_data.localRot0.y}, ${joint_data.localRot0.z})
			quatf physics:localRot1 = (${joint_data.localRot1.w}, ${joint_data.localRot1.x}, ${joint_data.localRot1.y}, ${joint_data.localRot1.z})
			float physics:lowerLimit = ${joint_data.lowerLimit}
			float physics:upperLimit = ${joint_data.upperLimit}
			float physxJoint:jointFriction = ${joint_data.friction}
		}
		`
	}

	return joint_info
}
function buildXform( object, geometry, material ) {

	const name = "Object_" + object.id;
	const transform = buildMatrix( object.matrixWorld );

	if ( object.matrixWorld.determinant() < 0 ) {

		console.warn( 'THREE.USDZExporter: USDZ does not support negative scales', object );

	}

	let joint_info = ''
	let joint_title = ''
	if (object.userData.joint_info) {
		for (let i = 0; i< object.userData.joint_info.length; i++){
			let joint_data = object.userData.joint_info[i]

			joint_info += buildJoint(joint_data)
		}
		joint_title=`"PhysxJointAPI"`
	}

	let collider_title, collider_body, rigid_title, rigid_body;
	if (object.userData.collider){
		collider_title = `"PhysicsCollisionAPI", "PhysxCollisionAPI", "PhysxConvexHullCollisionAPI", "PhysicsMeshCollisionAPI", "PhysxConvexDecompositionCollisionAPI", `
		collider_body = `bool physics:collisionEnabled = 1`
	} else {
		collider_title = ``
		collider_body = `bool physics:collisionEnabled = 0`
	}

	if (object.userData.rigid_body){
		rigid_title = `"PhysicsRigidBodyAPI", "PhysxRigidBodyAPI", "PhysicsMassAPI", `
		rigid_body = `
		bool physics:rigidBodyEnabled = 1
		float physics:mass = ${object.userData.mass}
		float physxRigidBody:maxLinearVelocity = 1000
		float physxRigidBody:sleepThreshold = 0.5
		`

	} else {
		rigid_title = ''
		rigid_body = `bool physics:rigidBodyEnabled = 0`
	}

	let geometry_info = ''
	geometry_info += `over "Geometry" (
		prepend references = @./geometries/Geometry_${ geometry.id }.usd@</Geometry>
	)
	{
		uniform token physics:approximation = "convexDecomposition"
		${collider_body}
	}`
	let apiSchemas = ''
	if (object.userData.rigid_body || object.userData.collider){
		apiSchemas = `(
			prepend apiSchemas = [${rigid_title}${collider_title}${joint_title}]
		)`
	}
	return `def Xform "${ name }" ${apiSchemas}
{
    matrix4d xformOp:transform = ${ transform }
    uniform token[] xformOpOrder = ["xformOp:transform"]
	uniform token physics:approximation = "convexDecomposition"

    rel material:binding = </World/Materials/Material_${ material.id }>

	bool physics:kinematicEnabled = 0
	${rigid_body}
    
    ${geometry_info}

	${ joint_info }
}

`;

}

function buildMatrix( matrix ) {

	const array = matrix.elements;

	return `( ${ buildMatrixRow( array, 0 ) }, ${ buildMatrixRow( array, 4 ) }, ${ buildMatrixRow( array, 8 ) }, ${ buildMatrixRow( array, 12 ) } )`;

}

function buildMatrixRow( array, offset ) {

	return `(${ array[ offset + 0 ] }, ${ array[ offset + 1 ] }, ${ array[ offset + 2 ] }, ${ array[ offset + 3 ] })`;

}

// Mesh

function buildMeshObject( geometry ) {


	const mesh = buildMesh( geometry );
	return `
def "Geometry"
{
  ${mesh}
}
`;

}

function buildMesh( geometry ) {
	const name = 'Geometry';
	const attributes = geometry.attributes;
	const count = attributes.position.count;

	return `
    def Mesh "Object_${ name }"
    {
        int[] faceVertexCounts = [${ buildMeshVertexCount( geometry ) }]
        int[] faceVertexIndices = [${ buildMeshVertexIndices( geometry ) }]
        normal3f[] normals = [${ buildVector3Array( attributes.normal, count )}] (
            interpolation = "vertex"
        )
        point3f[] points = [${ buildVector3Array( attributes.position, count )}]
        float2[] primvars:st = [${ buildVector2Array( attributes.uv, count )}] (
            interpolation = "vertex"
        )
        uniform token subdivisionScheme = "none"
    }
`;

}

function buildMeshVertexCount( geometry ) {

	const count = geometry.index !== null ? geometry.index.count : geometry.attributes.position.count;

	return Array( count / 3 ).fill( 3 ).join( ', ' );

}

function buildMeshVertexIndices( geometry ) {

	const index = geometry.index;
	const array = [];

	if ( index !== null ) {

		for ( let i = 0; i < index.count; i ++ ) {

			array.push( index.getX( i ) );

		}

	} else {

		const length = geometry.attributes.position.count;

		for ( let i = 0; i < length; i ++ ) {

			array.push( i );

		}

	}

	return array.join( ', ' );

}

function buildVector3Array( attribute, count ) {

	if ( attribute === undefined ) {

		console.warn( 'USDZExporter: Normals missing.' );
		return Array( count ).fill( '(0, 0, 0)' ).join( ', ' );

	}

	const array = [];

	for ( let i = 0; i < attribute.count; i ++ ) {

		const x = attribute.getX( i );
		const y = attribute.getY( i );
		const z = attribute.getZ( i );

		array.push( `(${ x.toPrecision( PRECISION ) }, ${ y.toPrecision( PRECISION ) }, ${ z.toPrecision( PRECISION ) })` );

	}

	return array.join( ', ' );

}

function buildVector2Array( attribute, count ) {

	if ( attribute === undefined ) {

		console.warn( 'USDZExporter: UVs missing.' );
		return Array( count ).fill( '(0, 0)' ).join( ', ' );

	}

	const array = [];

	for ( let i = 0; i < attribute.count; i ++ ) {

		const x = attribute.getX( i );
		const y = attribute.getY( i );

		array.push( `(${ x.toPrecision( PRECISION ) }, ${ 1 - y.toPrecision( PRECISION ) })` );

	}

	return array.join( ', ' );

}

// Materials

function buildMaterials( materials, textures ) {

	const array = [];

	for ( const uuid in materials ) {

		const material = materials[ uuid ];

		array.push( buildMaterial( material, textures ) );

	}

	return `def "Materials"
{
${ array.join( '' ) }
}

`;

}

function buildMaterial( material, textures ) {

	// https://graphics.pixar.com/usd/docs/UsdPreviewSurface-Proposal.html

	const pad = '            ';
	const inputs = [];
	const samplers = [];

	function buildTexture( texture, mapType, color ) {

		const id = texture.id + ( color ? '_' + color.getHexString() : '' );
		const isRGBA = texture.format === 1023;

		textures[ id ] = texture;

		return `
        def Shader "Transform2d_${ mapType }" (
            sdrMetadata = {
                string role = "math"
            }
        )
        {
            uniform token info:id = "UsdTransform2d"
            float2 inputs:in.connect = </World/Materials/Material_${ material.id }/uvReader_st.outputs:result>
            float2 inputs:scale = ${ buildVector2( texture.repeat ) }
            float2 inputs:translation = ${ buildVector2( texture.offset ) }
            float2 outputs:result
        }

        def Shader "Texture_${ texture.id }_${ mapType }"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @textures/Texture_${ id }.${ isRGBA ? 'png' : 'jpg' }@
            float2 inputs:st.connect = </World/Materials/Material_${ material.id }/Transform2d_${ mapType }.outputs:result>
            token inputs:wrapS = "repeat"
            token inputs:wrapT = "repeat"
            float outputs:r
            float outputs:g
            float outputs:b
            float3 outputs:rgb
            ${ material.transparent || material.alphaTest > 0.0 ? 'float outputs:a' : '' }
        }`;

	}

	if ( material.map !== null ) {

		inputs.push( `${ pad }color3f inputs:diffuseColor.connect = </World/Materials/Material_${ material.id }/Texture_${ material.map.id }_diffuse.outputs:rgb>` );

		if ( material.transparent ) {

			inputs.push( `${ pad }float inputs:opacity.connect = </World/Materials/Material_${ material.id }/Texture_${ material.map.id }_diffuse.outputs:a>` );

		} else if ( material.alphaTest > 0.0 ) {

			inputs.push( `${ pad }float inputs:opacity.connect = </World/Materials/Material_${ material.id }/Texture_${ material.map.id }_diffuse.outputs:a>` );
			inputs.push( `${ pad }float inputs:opacityThreshold = ${material.alphaTest}` );

		}

		samplers.push( buildTexture( material.map, 'diffuse', material.color ) );

	} else {

		inputs.push( `${ pad }color3f inputs:diffuseColor = ${ buildColor( material.color ) }` );

	}

	if ( material.emissiveMap !== null ) {

		inputs.push( `${ pad }color3f inputs:emissiveColor.connect = </World/Materials/Material_${ material.id }/Texture_${ material.emissiveMap.id }_emissive.outputs:rgb>` );

		samplers.push( buildTexture( material.emissiveMap, 'emissive' ) );

	} else if ( material.emissive.getHex() > 0 ) {

		inputs.push( `${ pad }color3f inputs:emissiveColor = ${ buildColor( material.emissive ) }` );

	}

	if ( material.normalMap !== null ) {

		inputs.push( `${ pad }normal3f inputs:normal.connect = </World/Materials/Material_${ material.id }/Texture_${ material.normalMap.id }_normal.outputs:rgb>` );

		samplers.push( buildTexture( material.normalMap, 'normal' ) );

	}

	if ( material.aoMap !== null ) {

		inputs.push( `${ pad }float inputs:occlusion.connect = </World/Materials/Material_${ material.id }/Texture_${ material.aoMap.id }_occlusion.outputs:r>` );

		samplers.push( buildTexture( material.aoMap, 'occlusion' ) );

	}

	if ( material.roughnessMap !== null && material.roughness === 1 ) {

		inputs.push( `${ pad }float inputs:roughness.connect = </World/Materials/Material_${ material.id }/Texture_${ material.roughnessMap.id }_roughness.outputs:g>` );

		samplers.push( buildTexture( material.roughnessMap, 'roughness' ) );

	} else {

		inputs.push( `${ pad }float inputs:roughness = ${ material.roughness }` );

	}

	if ( material.metalnessMap !== null && material.metalness === 1 ) {

		inputs.push( `${ pad }float inputs:metallic.connect = </World/Materials/Material_${ material.id }/Texture_${ material.metalnessMap.id }_metallic.outputs:b>` );

		samplers.push( buildTexture( material.metalnessMap, 'metallic' ) );

	} else {

		inputs.push( `${ pad }float inputs:metallic = ${ material.metalness }` );

	}

	if ( material.alphaMap !== null ) {

		inputs.push( `${pad}float inputs:opacity.connect = </World/Materials/Material_${material.id}/Texture_${material.alphaMap.id}_opacity.outputs:r>` );
		inputs.push( `${pad}float inputs:opacityThreshold = 0.0001` );

		samplers.push( buildTexture( material.alphaMap, 'opacity' ) );

	} else {

		inputs.push( `${pad}float inputs:opacity = ${material.opacity}` );

	}

	if ( material.isMeshPhysicalMaterial ) {

		inputs.push( `${ pad }float inputs:clearcoat = ${ material.clearcoat }` );
		inputs.push( `${ pad }float inputs:clearcoatRoughness = ${ material.clearcoatRoughness }` );
		inputs.push( `${ pad }float inputs:ior = ${ material.ior }` );

	}

	return `
    def Material "Material_${ material.id }"(
		prepend apiSchemas = ["PhysicsMaterialAPI"]
	)
    {
		token outputs:surface.connect = </World/Materials/Material_${ material.id }/PreviewSurface.outputs:surface>
        token inputs:frame:stPrimvarName = "st"
		float physics:dynamicFriction = 0.5
		float physics:restitution = 0
		float physics:staticFriction = 0.5

        def Shader "PreviewSurface"
        {
            uniform token info:id = "UsdPreviewSurface"
${ inputs.join( '\n' ) }
            int inputs:useSpecularWorkflow = 0
            token outputs:surface
        }



        def Shader "uvReader_st"
        {
            uniform token info:id = "UsdPrimvarReader_float2"
            token inputs:varname.connect = </World/Materials/Material_${ material.id }.inputs:frame:stPrimvarName>
            float2 inputs:fallback = (0.0, 0.0)
            float2 outputs:result
        }

${ samplers.join( '\n' ) }

    }
`;

}

function buildColor( color ) {

	return `(${ color.r }, ${ color.g }, ${ color.b })`;

}

function buildVector2( vector ) {

	return `(${ vector.x }, ${ vector.y })`;

}

export { USDZExporter };