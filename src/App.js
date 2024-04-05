import { useEffect , useRef} from 'react';
import { useState } from "react";

import * as THREE from 'three';
import { GUI } from 'dat.gui';

import SceneInit from './SceneInit';
import ThreeScene from './Scene';
import {
  Tree,
  getBackendOptions,
  MultiBackend,
} from "@minoru/react-dnd-treeview";
import { DndProvider } from "react-dnd";
import initialData from "./sample-default.json";
import emptyData from "./empty.json";
let test = undefined

function App() {


    function updateTree(newTreeData, test){
      console.log("update tree", this, test)
      test.treeUpdated(newTreeData)
    }

    function handleDrop(newTreeData, test, setTreeData){
      console.log("handle drop", this)
      updateTree(newTreeData, test)
      setTreeData(newTreeData);
    }

  const [treeData, setTreeData] = useState(emptyData);

  useEffect(() => {
    console.log("use effect 1")
    console.log(treeData)
    test = new SceneInit('myThreeJsCanvas', (data) => handleDrop(data, test, setTreeData), treeData);
    test.initialize();
    test.animate();

   
    // Destroy the GUI on reload to prevent multiple stale UI from being displayed on screen.
    return () => {
      test.gui.destroy();
    };
  }, []);


  return (
    <div>
      <ThreeScene style={{position: 'relative', width: '100%', height: '100%'}}/>
      <div id="sidebar" style={{position:'absolute'}}>
        <DndProvider id="dndprovidertree" backend={MultiBackend} options={getBackendOptions()}>
            <Tree
              tree={treeData}
              rootId={0}
              onDrop={(data) => handleDrop(data, test, setTreeData)}
              render={(node, { depth, isOpen, onToggle }) => (
                <div >
                  {node.droppable && (
                    <span onClick={onToggle}>{isOpen ? "[-]" : "[+]"}</span>
                  )}
                  {node.text}
                </div>
              )}
            />
        </DndProvider>
      </div>
    </div>
    
  );
}

export default App;