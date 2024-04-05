import React from 'react';
import * as THREE from 'three';
import ViewGL from './ViewGL';

export default class ThreeScene extends React.Component {
    constructor(props){
        super(props)
        this.canvasRef = React.createRef();
    }
    render(){
        return (
            <div id="canvasContainer" style={{height:"100%"}}>
                <canvas ref={this.canvasRef} />
            </div>
        )
    }

    // ******************* COMPONENT LIFECYCLE ******************* //
    componentDidMount() {
        const canvas = this.canvasRef.current
    }

    componentWillUnmount(){
        window.removeEventListener("mousedown", this.onMouseDown)
        window.removeEventListener("keydown", this.onKeyDown)
        window.removeEventListener("resize", this.onKeyDown)
    }

    onWindowResize(){
        this.viewGL.onWindowResize()
    }

    onKeyDown(e){
        this.viewGL.onKeyDown(e)
    }

    onMouseDown(e){
        this.viewGL.onMouseDown(e)
    }
}
