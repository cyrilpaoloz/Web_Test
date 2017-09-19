// This is the function that's called when the page first loads
document.addEventListener("DOMContentLoaded", function() {

    // Create the render window here
    const threes = new ThreeRenderer();
    
    initializeView(threes);

    window.addEventListener('resize', function() { 
        threes.resize(window.innerWidth, window.innerHeight)
    });

    // Start the animation
    threes.animate();
});

function initializeView(threes) {
    const navs = document.querySelectorAll(".nav-item");
    const defaultFooter = document.querySelector("#default-footer");
    const modelFooter = document.querySelector("#model-footer");
    let activeBlade = null;
    let activeFooter = defaultFooter;

    const modelFooterFade = (fadeIn) => {
        if(fadeIn)
            classie.remove(threes.viewport, "active");
        else
            classie.add(threes.viewport, "active");
    };

    const switchView = (blade) => {
        let footerAttr = blade.getAttribute("footer");
        // footer is equal to current element or default
        let footer = footerAttr ? document.getElementById(footerAttr) : defaultFooter;
        if (activeFooter != footer) {
            if (activeFooter == modelFooter)
                modelFooterFade(false);
            classie.remove(activeFooter, "active");
        }
        // if there is an active blade close it
        if(activeBlade){
            classie.remove(activeBlade, "active");
            // 1.5 seconds later, open the blade
            if(activeBlade != blade)
                window.setTimeout(() => switchView(blade, 1500));
            activeBlade = null;
        }
        else {
            // Open the blade
            activeBlade = blade;
            activeFooter = footer;
            if(activeFooter == modelFooter)
                modelFooterFade(true);
            classie.add(activeBlade, "active");
            classie.add(footer, "active");
        }
    };

    for(let i=0;i<navs.length;i++) {
        navs[i].addEventListener("click", function() {
            const blade =  document.getElementById(navs[i].getAttribute("show-blade"));
            switchView(blade);
        });
    }
    
    initializeModelFooter(modelFooterFade);
    initializeModelCovers(threes);
}

function initializeModelCovers(threes) {
    const viewButtons = document.querySelectorAll(".model-view");
    const viewModel = (e) => {
        const modelName = e.currentTarget.getAttribute("model");
        classie.add(threes.viewport, "active");
        threes.setModel(`assets/models/${modelName}`);
    };
    for(let i=0;i<viewButtons.length;i++)
        viewButtons[i].addEventListener("click", viewModel);
}

function initializeModelFooter(modelFooterFade) {
    const links = document.querySelectorAll(".model-link");
    const slider = document.getElementById("footer-slider");
    let currLink = links[0];
    let currCover = document.getElementById("model-1");
    const onFooterClick = function(e) {
        modelFooterFade(true);
        // Remove old state from footer
        classie.remove(slider, currLink.getAttribute("footer-slider"));
        classie.remove(currLink, "active");
        currLink = e.currentTarget;
        // Set new state in footer
        slider.setAttribute("class", currLink.getAttribute("slider-pos"));
        classie.add(currLink, "active");
        // deactivate old cover
        if (currCover)
            classie.remove(currCover, "active");
        currCover = document.getElementById(currLink.getAttribute("model-cover"));
        classie.add(currCover, "active");
    }
    for(let i=0;i<links.length;i++) {
        let link = links[i];
        link.addEventListener("click", onFooterClick);
    }
}

// Hey Cyril, to increase the fisheye effect:
// (1) Go to this demo page: http://www.decarpentier.nl/downloads/lensdistortion-webgl/lensdistortion-webgl.html
// (2) Plug the numbers in order: HORIZONTAL_FOV, strength, cylindricalRatio
const HORIZONTAL_FOV = 140;
const STRENGTH = 1;//0.5;//1;
const CYLINDRICAL_RATIO = 1.25;//0.25;
const ROTATE_VELO = 0.5;

const BACKGROUND = 0x0a0a0a;
const AMBIENT = "red";
const SPOTLIGHT = 0xffffff;

const GRID_SPACING = 120;
const GRID_DEPTH = 25;
const CAMERA_DISTANCE = 150; // camera distance from axis
const LAYERS = 3; // number of cross layers
const VELO = 1; // Pixel movement per frame

// This class is responsible for rendering everything
// FishEYE Source: https://stackoverflow.com/questions/13360625/
class ThreeRenderer {
  constructor() {
    // bind animate function so that it can call itself
    this.animate = this.animate.bind(this);

    this.scene = new THREE.Scene();
    var WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight;

    // Create a this.renderer and add it to the DOM.
    this.renderer = new THREE.WebGLRenderer({antialias:true});
    this.renderer.setSize(WIDTH, HEIGHT);
    this.viewport = document.getElementById("viewport");
    this.viewport.appendChild(this.renderer.domElement);

    // Mouse dragging controls
    this.renderer.domElement.addEventListener("mousedown", this.mouseDown.bind(this));
    this.renderer.domElement.addEventListener("mouseup", this.mouseUp.bind(this));
    this.renderer.domElement.addEventListener("mousemove", this.mouseDrag.bind(this));
    this.dragging = false;

    // Create a this.camera, zoom it out from the model a bit, and add it to the this.scene.
    this.camera = new THREE.PerspectiveCamera( 100, WIDTH / HEIGHT, 1, CAMERA_DISTANCE + GRID_DEPTH + 1000);
        
    this.camera.position.set(0, CAMERA_DISTANCE, 0);
    this.camera.lookAt(new THREE.Vector3(0,0,0));
    this.camera.up = new THREE.Vector3(0,0,-1);

    // Create effect composer
    let composer = new THREE.EffectComposer(this.renderer);
    composer.addPass(new THREE.RenderPass(this.scene, this.camera) );

    let effect = new THREE.ShaderPass(getDistortionShaderDefinition());
    composer.addPass(effect);
    effect.renderToScreen = true;

    // Setup distortion effect
    var height = Math.tan(THREE.Math.degToRad(HORIZONTAL_FOV) / 2) / this.camera.aspect;

    this.camera.fov = Math.atan(height) * 2 * 180 / 3.1415926535;
    this.camera.updateProjectionMatrix();

    effect.uniforms["strength"].value = STRENGTH;
    effect.uniforms["height"].value = height;
    effect.uniforms["aspectRatio"].value = this.camera.aspect;
    effect.uniforms["cylindricalRatio"].value = CYLINDRICAL_RATIO;

    // Set the background color of the this.scene.
    this.renderer.setClearColor(BACKGROUND, 1);

    // Create a light, set its position, and add it to the this.scene.
    var light = new THREE.PointLight(0xffffff);
    light.position.set(0, CAMERA_DISTANCE, 0);
    this.scene.add(light);
    this.sceneLight = light;

    // var ambiColor = "#FFF";
    // var ambientLight = new THREE.AmbientLight(ambiColor);
    // this.scene.add(ambientLight);

    // Load in the mesh and add it to the this.scene.
    this.plusMaterial = new THREE.MeshLambertMaterial({color: 0x999999});
    var loader = new THREE.JSONLoader();
    loader.load( "assets/models/plus_v4.js", (geometry) => {
        this.loadMeshes(geometry, this.plusMaterial);
    });
    this.homeActive = true;
    this.velo = [VELO, 0];
    this.modelMaterial = new THREE.MeshLambertMaterial({color: 0xFFFFFF});
    
    // Add OrbitControls so that we can pan around with the mouse.
    // Disable user input
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.userPan = this.controls.userRotate = this.controls.userZoom = false;
  } 

  mouseUp(e) {
    this.dragging = false;
  }

  mouseDown(e) {
    this.dragging = true;
  }

  mouseDrag(e) {
    if(this.homeActive) {
        let cw = this.renderer.domElement.width / 2;
        let ch = this.renderer.domElement.height / 2;
        let dw = cw - e.offsetX;
        let dh = ch - e.offsetY;
        let length = Math.sqrt(dw * dw + dh * dh);
        this.velo = [dw / length * VELO, dh / length * VELO];
    }
    else if(this.dragging) {
        let delta = Math.PI / 180 * ROTATE_VELO * e.movementX;
        this.controls.rotateLeft(delta);
    }
  }


  loadMeshes(geometry, material) {
    this.meshes = [];
    for(let l = 0; l < LAYERS; l++) {
        const dist = l * GRID_DEPTH;
        const vFOV = this.camera.fov * Math.PI / 180;
        const boundedHeight = 2 * Math.tan( vFOV / 2 ) * (dist + CAMERA_DISTANCE);
        const boundedWidth = this.camera.aspect * boundedHeight;
        let height = Math.ceil(boundedHeight / 2 / GRID_SPACING) * GRID_SPACING * 2;
        let width = Math.ceil(boundedWidth / 2 / GRID_SPACING) * GRID_SPACING * 2;
        for(let x = -width / 2; x<= width / 2 + GRID_SPACING; x += GRID_SPACING) {
            for(let z = -height / 2; z <= height / 2 + GRID_SPACING; z += GRID_SPACING) {
                let mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(x, -dist, z + GRID_SPACING / 2);
                mesh.dist = dist;
                this.meshes.push(mesh);
                this.scene.add(mesh);
            }
        }
    }
  }

  resize(width, height) {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  clearScene() {
        for( var i = this.scene.children.length - 0; i >= 1; i--) {
            var obj = this.scene.children[i];
            if(obj != this.sceneLight)
                this.scene.remove(obj);
        }
    }

  // Renders the this.scene and updates the render as needed.
  animate() {
    requestAnimationFrame(this.animate);

    // Move all the meshes
    const vFOV = this.camera.fov * Math.PI / 180;
    if(this.meshes) {
        for(let i = 0; i < this.meshes.length; i++) {
            let mesh = this.meshes[i];
            
            let boundedHeight = 2 * Math.tan( vFOV / 2 ) * (mesh.dist + CAMERA_DISTANCE);
            const boundedWidth = (this.camera.aspect * boundedHeight) / 2;
            boundedHeight /= 2;
            let width = Math.ceil(boundedWidth / 2 / GRID_SPACING) * GRID_SPACING * 2;
            let height = Math.ceil(boundedHeight / 2 / GRID_SPACING) * GRID_SPACING * 2;
            let newX = mesh.position.x + this.velo[0];
            let newY = mesh.position.z + this.velo[1];
            if(this.velo[0] > 0 && newX > width)
                newX -= width * 2;
            else if(this.velo[0] < 0 && newX < -width)
                newX += width * 2;
            if(this.velo[1] > 0 && newY > height)
                newY -= height * 2;
            if(this.velo[1] < 0 && newY < -height)
                newY += height * 2;
            mesh.position.set(newX, mesh.position.y, newY);
        }
    }
    this.sceneLight.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    
    // Render the this.scene.
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
  }

  setModel(assetName) {
      this.clearScene();
      this.homeActive = false;
      this.controls.autoRotate = true;
      var loader = new THREE.JSONLoader();
      const SCALE = 10;
      loader.load(`assets/models/monkey_sample.js`, (geometry) => {
        let mesh = new THREE.Mesh(geometry, this.modelMaterial);
        this.scene.add(mesh);
        mesh.scale.x = SCALE;
        mesh.scale.y = SCALE;
        mesh.scale.z = SCALE;
        
        geometry.computeBoundingSphere();
        let radius = geometry.boundingSphere.radius;
        let distanceFactor = Math.abs( this.camera.aspect * radius / Math.sin( this.camera.fov / 2 )) * SCALE / 4;
        
        this.camera.position.set(0, 0, distanceFactor);
        this.camera.up.set(0, 1, 0);
        
        var ambientLight = new THREE.AmbientLight(AMBIENT);
        this.scene.add(ambientLight);

        this.camera.updateProjectionMatrix();
        this.activeMesh = mesh;
      });
  }

  resetSplash() {
    this.clearScene();
    this.controls.autoRotate = false;
    for(let i=0;i<this.meshes.length;i++)
        this.scene.add(meshes[i]);
    this.homeActive = true;
    var light = new THREE.PointLight(0xffffff);
    light.position.set(0, CAMERA_DISTANCE, 0);
    this.scene.add(light);
  }
}


// Just a distorition shader for the fisheye effect.
// FishEYE Source: https://stackoverflow.com/questions/13360625/
function getDistortionShaderDefinition() {
    return {

        uniforms: {
            "tDiffuse":         { type: "t", value: null },
            "strength":         { type: "f", value: 0 },
            "height":           { type: "f", value: 1 },
            "aspectRatio":      { type: "f", value: 1 },
            "cylindricalRatio": { type: "f", value: 1 }
        },

        vertexShader: [
            "uniform float strength;",          // s: 0 = perspective, 1 = stereographic
            "uniform float height;",            // h: tan(verticalFOVInRadians / 2)
            "uniform float aspectRatio;",       // a: screenWidth / screenHeight
            "uniform float cylindricalRatio;",  // c: cylindrical distortion ratio. 1 = spherical

            "varying vec3 vUV;",                // output to interpolate over screen
            "varying vec2 vUVDot;",             // output to interpolate over screen

            "void main() {",
                "gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0));",

                "float scaledHeight = strength * height;",
                "float cylAspectRatio = aspectRatio * cylindricalRatio;",
                "float aspectDiagSq = aspectRatio * aspectRatio + 1.0;",
                "float diagSq = scaledHeight * scaledHeight * aspectDiagSq;",
                "vec2 signedUV = (2.0 * uv + vec2(-1.0, -1.0));",

                "float z = 0.5 * sqrt(diagSq + 1.0) + 0.5;",
                "float ny = (z - 1.0) / (cylAspectRatio * cylAspectRatio + 1.0);",

                "vUVDot = sqrt(ny) * vec2(cylAspectRatio, 1.0) * signedUV;",
                "vUV = vec3(0.5, 0.5, 1.0) * z + vec3(-0.5, -0.5, 0.0);",
                "vUV.xy += uv;",
            "}"
        ].join("\n"),

        fragmentShader: [
            "uniform sampler2D tDiffuse;",      // sampler of rendered scene?s render target
            "varying vec3 vUV;",                // interpolated vertex output data
            "varying vec2 vUVDot;",             // interpolated vertex output data

            "void main() {",
                "vec3 uv = dot(vUVDot, vUVDot) * vec3(-0.5, -0.5, -1.0) + vUV;",
                "gl_FragColor = texture2DProj(tDiffuse, uv);",
            "}"
        ].join("\n")

    };
}