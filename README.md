# RialTo GUI
We try to host the GUI [here](http://improbable008.csail.mit.edu). You can also run it on your local machine following the instructions below.

This repository provides the official implementation of the RialTo GUI, as proposed in *Reconciling Reality through Simulation: A Real-to-Sim-to-Real approach for Robust Manipulation*
The manuscript is available on [arXiv](https://arxiv.org/abs/2403.03949). See the [project page](https://real-to-sim-to-real.github.io/RialTo/)

If you use this codebase, please cite

```
@article{torne2024reconciling,
  title={Reconciling Reality through Simulation: A Real-to-Sim-to-Real Approach for Robust Manipulation},
  author={Torne, Marcel and Simeonov, Anthony and Li, Zechu and Chan, April and Chen, Tao and Gupta, Abhishek and Agrawal, Pulkit},
  journal={arXiv preprint arXiv:2403.03949},
  year={2024}
}
```

## Tutorial
Start launching the GUI by visiting the following website: http://improbable008.csail.mit.edu

Scan scene and any additional objects you want to interact with:
1. Use Polycam for the scenes
2. Use ARCode for single objects (where you can do a 360 scan around the object)
3. Download the mesh as a USDZ/USD or GLB
4. If you download it as a USDZ convert it into a GLB file through: https://products.aspose.app/3d/conversion/usdz-to-glb
5. Go to the GUI and import your scene and objects (click on upload from local on the menu bar)
6. You can move/rotate/scale the objects by clicking on the object and selecting on the position/rotation/scale buttons on the menu bar
7. Cut objects: click on Pre Cut > a bounding box will appear > you make sure the object you want to separate is within the bounding box (you can scale/rotate/move the box) > click post cut
8. Delete objects: Select object and click on delete (you can delete the table for example)
9. Add a joint:
    
    a. Click on pre add joint > select two meshes you want to add a joint between > mid add joint, place the joint in the correct place > select post add $joint_type (fixed, revolute, prismatic)
   
    b. If you want to add a fixed joint on a single object (meaning it will remain static you can click on pre add joint > select only the desired object > mid add joint > post add fixed joint)
10. Add a site (marker to access it on the reward function) (I would always do this when designing rewards to make sure you know where the objects are exactly because sometimes the meshes can be not centered):
    
    a. Select object you want to attach a site to > pre add site > position the site in the correct place > scale it to make it small > post add site
11. Recommendations:
    
      a. add a fixed joint on the main scene so that it doesn't fall with gravity
12. When you are done click on Download and move it to your USDAssets/scenes folder
13. Open it on isaac sim using Open > File and run the physics (play button) to make sure everything is correct
14. Specify the necessary values in the config file and collect demos

## Main Interface
![alt text](https://github.com/IAILeveragingRealToSim/RealToSimAPI/blob/main/materials/interface.png?raw=true)

## Running API on the local machine
### Install node to your local machine
1. Install nvm 

Reference: https://github.com/nvm-sh/nvm#installing-and-updating

```
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
```

verify nvm was properly installed

```
nvm -v
```

2. Install Node.js

Reference: https://medium.com/@iam_vinojan/how-to-install-node-js-and-npm-using-node-version-manager-nvm-143165b16ce1
```
nvm install --lts
```

verify node was properly installed

```
npm --version
node --version
```


### Run API Locally
```
npm i --force
```

```
npm start
```

### Run API on a public port

```
make
make run
```

## Installation:

Install node (recommend installing on MacOS)

