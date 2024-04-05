class Joint{
    constructor(mesh, joint_type, joint_pos=null, joint_axis=null){
        this.joint_type = joint_type
        this.joint_pos = joint_pos
        this.joint_axis = joint_axis
        this.mesh = mesh
        this.mimicJoints = []
        this.hasBeenChecked = false
        this.deleted = false
    }

    get id() {
        return this.mesh.id
    }

    setJointType(joint_type, joint_pos, joint_axis){
        if (joint_type === "free"){
            this.joint_type = joint_type
            this.joint_pos = joint_pos
            this.joint_axis = joint_axis

            return true
        }

        if(!joint_pos || ! joint_axis){
            print("Attention: joint not properly set")
            return false
        }

        this.joint_type = joint_type
        this.joint_pos = joint_pos
        this.joint_axis = joint_axis

    }

    addMimicJoint(joint){
        this.mimicJoints.push(joint)
    }

    removeMimicJoint(joint_id){
        if (this.id() == joint_id) {
            this.deleted = true

            return true
        }
        newMimicJoints = []
        this.mimicJoints.forEach((joint) => {
            if (!joint.removeMimicJoint(joint_id)){
                newMimicJoints.push(joint)
            }
        })
        this.mimicJoints = newMimicJoints
        return false
    }

    setJointValue(value, joint_type=null, joint_pos=null, joint_axis=null){

        if (this.hasBeenChecked){
            print("ATTENTION: there is a loop in the joint graph")
            return
        }

        this.hasBeenChecked = true

        if (!joint_type){
            joint_pos = this.joint_pos
            joint_axis = this.joint_axis
            joint_type = this.joint_type
        }
        
        this.mimicJoints.forEach(joint => {
            joint.setJointValue(value, joint_pos, joint_axis)
        })

        if (joint_type === "prismatic" || joint_type === "free"){
            new_position_delta = value
            this.mesh.position.add(new_position_delta)
        }

        if (joint_type === "revolute"){
            new_position_pos_delta, new_position_rot_quat = computePositionAndRevo(value, joint_pos, joint_axis)
            this.mesh.position.add(new_position_pos_delta)
            this.mesh.quaternion.multiply(new_position_rot_quat)
        }

        this.hasBeenChecked = false
    }


}

class Robot {
    constructor(){
        this.joints = {}
    }

    addJoint(object_name, joint){
        this.joints[object_name] = joint
    }

    createJoint(object_name, mesh) {
        let new_joint = Joint(mesh, "free")
        this.joints[object_name] = new_joint
    }

    addRevoJoint(parent_name, child_name, joint_pos, joint_axis){
        this.joints[parent_name].setJointType("revolute", joint_pos, joint_axis)
        this.joints[parent_name].addMimicJoint(this.joints[child_name])
    }

    addPrisJoint(parent_name, child_name, joint_pos, joint_axis) {
        this.joints[parent_name].setJointType("prismatic", joint_pos, joint_axis)
        this.joints[parent_name].addMimicJoint(this.joints[child_name])
    }
}