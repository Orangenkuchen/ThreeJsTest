import {V as Vector3, S as Spherical, f, M as MathUtils, a as Scene, P as PerspectiveCamera, W as WebGLRenderer, b as STATS, C as Clock, T as TorusGeometry, c as MeshStandardMaterial, d as Mesh, e as PointLight, A as AmbientLight, g as PointLightHelper, G as GridHelper, O as OrbitControls, h as TextureLoader, i as SphereGeometry, j as GLTFLoader, Q as Quaternion} from "./vendor.91c31a58.js";
var style = "canvas {\n  position: fixed;\n  top: 0;\n  left: 0;\n}\n\n.Overlay {\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n\n  pointer-events: none;\n\n  display: flex;\n  flex-direction: column;\n\n  background-color: #000000F0;\n}\n\n.Overlay > .OverlayText {\n  margin: auto;\n\n  font-size: 40px;\n  color: white;\n}\n\n.Hide {\n  display: none;\n}";
class FirstPersonControls {
  constructor(object, domElement) {
    this.cleanUpActions = new Array();
    this.object = object;
    this.domElement = domElement;
    this.lookDirection = new Vector3();
    this.lookTarget = new Vector3();
    this.spherical = new Spherical();
    this.lookTargetPosition = new Vector3();
    this.controllerLookSpeedCubicBezier = new f(0.33, 0, 1, 0.66);
    this.gamepadHashTable = {};
    this.Enabled = true;
    this.MovementSpeed = 1;
    this.MouseLookSpeed = 5e-3;
    this.ControllerLookSpeed = 1;
    this.ViewHalfX = 0;
    this.ViewHalfY = 0;
    this.XMovement = 0;
    this.YMovement = 0;
    this.ZMovement = 0;
    this.controllerXLook = 0;
    this.controllerYLook = 0;
    this.mouseXLook = 0;
    this.mouseYLook = 0;
    this.longitude = 0;
    this.latitude = 0;
    this.HeightSpeed = false;
    this.HeightCoefficient = 1;
    this.HeightMin = 0;
    this.HeightMax = 1;
    this.AutoSpeedFactor = 0;
    this.AutoForward = false;
    this.UseController = true;
    this.ActiveLook = true;
    this.LookVertical = true;
    this.ConstrainVertical = false;
    this.VerticalMin = 0;
    this.VerticalMax = Math.PI;
    let contextMenuHandler = (event) => {
      this.HandleOnContextMenu(event);
    };
    this.domElement.addEventListener("contextmenu", contextMenuHandler);
    this.cleanUpActions.push(() => {
      this.domElement.removeEventListener("contextmenu", contextMenuHandler);
    });
    let mouseMoveHandler = (event) => {
      this.HandleOnMouseMove(event);
    };
    this.domElement.addEventListener("mousemove", mouseMoveHandler);
    this.cleanUpActions.push(() => {
      this.domElement.removeEventListener("mousemove", mouseMoveHandler);
    });
    let mouseDownHandler = (event) => {
      this.HandleOnMouseDown(event);
    };
    this.domElement.addEventListener("mousedown", mouseDownHandler);
    this.cleanUpActions.push(() => {
      this.domElement.removeEventListener("mousedown", mouseDownHandler);
    });
    let mouseUpHandler = (event) => {
      this.HandleOnMouseUp(event);
    };
    this.domElement.addEventListener("mouseup", mouseUpHandler);
    this.cleanUpActions.push(() => {
      this.domElement.removeEventListener("mouseup", mouseUpHandler);
    });
    let keyboardKeyDownHandler = (event) => {
      this.HandleOnKeyDown(event);
    };
    window.addEventListener("keydown", keyboardKeyDownHandler);
    this.cleanUpActions.push(() => {
      window.removeEventListener("keydown", keyboardKeyDownHandler);
    });
    let keyboardKeyUpHandler = (event) => {
      this.HandleOnKeyUp(event);
    };
    window.addEventListener("keyup", keyboardKeyUpHandler);
    this.cleanUpActions.push(() => {
      window.removeEventListener("keyup", keyboardKeyUpHandler);
    });
    let gamepadConnectedHandler = (event) => {
      this.HandleOnControllerConnected(event);
    };
    window.addEventListener("gamepadconnected", gamepadConnectedHandler);
    this.cleanUpActions.push(() => {
      window.removeEventListener("gamepadconnected", gamepadConnectedHandler);
    });
    let gamepadDisconnectedHandler = (event) => {
      this.HandleOnControllerDisconnected(event);
    };
    window.addEventListener("gamepaddisconnected", gamepadDisconnectedHandler);
    this.cleanUpActions.push(() => {
      window.removeEventListener("gamepaddisconnected", gamepadDisconnectedHandler);
    });
    this.HandleResize();
    this.SetOrientation();
  }
  Dispose() {
    for (let cleanUpAction of this.cleanUpActions) {
      cleanUpAction();
    }
    this.cleanUpActions.length = 0;
  }
  LookAt(xOrVector, yOrUndefined, zOrUndefined) {
    if (xOrVector instanceof Vector3) {
      this.lookTarget.copy(xOrVector);
    } else {
      this.lookTarget.set(xOrVector, yOrUndefined, zOrUndefined);
    }
    this.object.lookAt(this.lookTarget);
    this.SetOrientation();
  }
  Update(clockDelta) {
    if (this.Enabled === false) {
      return;
    }
    this.CheckAndProcessControllerInput();
    if (this.HeightSpeed) {
      const y = MathUtils.clamp(this.object.position.y, this.HeightMin, this.HeightMax);
      const heightDelta = y - this.HeightMin;
      this.AutoSpeedFactor = clockDelta * (heightDelta * this.HeightCoefficient);
    } else {
      this.AutoSpeedFactor = 0;
    }
    const actualMoveSpeed = clockDelta * this.MovementSpeed;
    if (Math.abs(this.ZMovement) > 0 || this.AutoForward) {
      this.object.translateZ((actualMoveSpeed + this.AutoSpeedFactor) * this.ZMovement);
    }
    if (Math.abs(this.XMovement) > 0) {
      this.object.translateX(actualMoveSpeed * this.XMovement);
    }
    if (Math.abs(this.YMovement) > 0) {
      this.object.translateY(actualMoveSpeed * this.YMovement);
    }
    let actualLookSpeed = clockDelta * this.MouseLookSpeed;
    if (this.ActiveLook == false) {
      actualLookSpeed = 0;
    }
    let verticalLookRatio = 1;
    if (this.ConstrainVertical) {
      verticalLookRatio = Math.PI / (this.VerticalMax - this.VerticalMin);
    }
    if (Math.abs(this.mouseXLook) > 0) {
      this.longitude -= this.mouseXLook * actualLookSpeed;
    }
    if (Math.abs(this.controllerXLook) > 0) {
      this.longitude += this.controllerXLook * actualLookSpeed * this.ControllerLookSpeed;
    }
    if (this.LookVertical) {
      if (Math.abs(this.mouseYLook) > 0) {
        this.latitude -= this.mouseYLook * actualLookSpeed * verticalLookRatio;
      }
      if (Math.abs(this.controllerYLook) > 0) {
        this.latitude += this.controllerYLook * actualLookSpeed * verticalLookRatio * this.ControllerLookSpeed;
      }
    }
    this.latitude = Math.max(-85, Math.min(85, this.latitude));
    let phi = MathUtils.degToRad(90 - this.latitude);
    const theta = MathUtils.degToRad(this.longitude);
    if (this.ConstrainVertical) {
      phi = MathUtils.mapLinear(phi, 0, Math.PI, this.VerticalMin, this.VerticalMax);
    }
    const position = this.object.position;
    this.lookTargetPosition.setFromSphericalCoords(1, phi, theta).add(position);
    this.object.lookAt(this.lookTargetPosition);
    this.mouseXLook = 0;
    this.mouseYLook = 0;
  }
  HandleResize() {
    this.ViewHalfX = this.domElement.offsetWidth / 2;
    this.ViewHalfY = this.domElement.offsetHeight / 2;
  }
  HandleOnMouseDown(event) {
    event.preventDefault();
    if (document.pointerLockElement == this.domElement) {
      console.debug("The canvas already has the pointer lock.");
    } else {
      console.debug("The canvas does not jet have the pointer lock. Requesting...");
      this.domElement.requestPointerLock();
    }
  }
  HandleOnMouseUp(event) {
    event.preventDefault();
  }
  HandleOnMouseMove(event) {
    this.mouseXLook = event.movementX;
    this.mouseYLook = event.movementY;
  }
  HandleOnKeyDown(event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this.ZMovement = -1;
        break;
      case "ArrowLeft":
      case "KeyA":
        this.XMovement = -1;
        break;
      case "ArrowDown":
      case "KeyS":
        this.ZMovement = 1;
        break;
      case "ArrowRight":
      case "KeyD":
        this.XMovement = 1;
        break;
      case "ShiftLeft":
        this.YMovement = -1;
        break;
      case "Space":
        this.YMovement = 1;
        break;
    }
  }
  HandleOnKeyUp(event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this.ZMovement = 0;
        break;
      case "ArrowLeft":
      case "KeyA":
        this.XMovement = 0;
        break;
      case "ArrowDown":
      case "KeyS":
        this.ZMovement = 0;
        break;
      case "ArrowRight":
      case "KeyD":
        this.XMovement = 0;
        break;
      case "ShiftLeft":
        this.YMovement = 0;
        break;
      case "Space":
        this.YMovement = 0;
        break;
    }
  }
  HandleOnControllerConnected(gamepadEvent) {
    console.debug("Gamepad connected at index %d: %s. %d buttons, %d axes.", gamepadEvent.gamepad.index, gamepadEvent.gamepad.id, gamepadEvent.gamepad.buttons.length, gamepadEvent.gamepad.axes.length);
    this.gamepadHashTable[gamepadEvent.gamepad.index] = gamepadEvent.gamepad;
  }
  HandleOnControllerDisconnected(gamepadEvent) {
    console.log("Gamepad disconnected from index %d: %s", gamepadEvent.gamepad.index, gamepadEvent.gamepad.id);
    delete this.gamepadHashTable[gamepadEvent.gamepad.index];
  }
  CheckAndProcessControllerInput() {
    const axisDeadZone = 0.05;
    let firstGamepad = null;
    for (let index in this.gamepadHashTable) {
      firstGamepad = this.gamepadHashTable[index];
      break;
    }
    if (firstGamepad != null) {
      let moveXAmount = firstGamepad.axes[0];
      let moveZAmount = firstGamepad.axes[1];
      let moveYAmount = 0;
      let lookXAmount = firstGamepad.axes[3];
      let lookYAmount = firstGamepad.axes[4];
      if (Math.abs(moveXAmount) < axisDeadZone) {
        moveXAmount = 0;
      }
      if (Math.abs(moveZAmount) < axisDeadZone) {
        moveZAmount = 0;
      }
      if (firstGamepad.buttons[11].pressed) {
        moveYAmount += -1;
      }
      if (firstGamepad.buttons[0].pressed) {
        moveYAmount += 1;
      }
      if (Math.abs(lookXAmount) < axisDeadZone) {
        lookXAmount = 0;
      }
      if (Math.abs(lookYAmount) < axisDeadZone) {
        lookYAmount = 0;
      }
      this.XMovement = moveXAmount;
      this.YMovement = moveYAmount;
      this.ZMovement = moveZAmount;
      lookXAmount = this.ScaleControllerLookAxis(lookXAmount);
      lookYAmount = this.ScaleControllerLookAxis(lookYAmount);
      this.controllerXLook = lookXAmount * -1;
      this.controllerYLook = lookYAmount * -1;
    }
  }
  ScaleControllerLookAxis(value) {
    let scaledValue = this.controllerLookSpeedCubicBezier(Math.abs(value));
    if (value < 0) {
      scaledValue *= -1;
    }
    return scaledValue;
  }
  SetOrientation() {
    const quaternion = this.object.quaternion;
    this.lookDirection.set(0, 0, -1).applyQuaternion(quaternion);
    this.spherical.setFromVector3(this.lookDirection);
    this.latitude = 90 - MathUtils.radToDeg(this.spherical.phi);
    this.longitude = MathUtils.radToDeg(this.spherical.theta);
  }
  HandleOnContextMenu(event) {
    debugger;
    event.preventDefault();
  }
}
class Main {
  constructor() {
    this.stats = null;
    this.mainScene = new Scene();
    this.playerCamera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2e3);
    this.mainRenderer = new WebGLRenderer();
    try {
      this.stats = new STATS();
      this.stats.showPanel(0);
    } catch (error) {
      console.error("Error displaying Stats-Panel: %o", error);
    }
    this.clock = new Clock(true);
    this.torus = null;
    this.orbitControls = null;
    this.firstPersonControls = null;
    this.overlayElement = null;
    this.overlayTextElement = null;
    this.robotBones = null;
    this.robotControl = {
      Axis1: 0,
      Axis2: 0,
      Axis3: 0,
      Axis4: 0,
      Axis5: 0,
      Axis6: 0
    };
    this.BindRobotAxisKeys();
    document.addEventListener("pointerlockchange", (event) => {
      if (this.firstPersonControls && this.firstPersonControls.Enabled) {
        if (document.pointerLockElement) {
          this.HideOverlay();
        } else {
          this.ShowOverlay("Klicken zum steuern...");
        }
      }
    }, false);
  }
  Load() {
    console.info("Main.Load wurde aufgerufen...");
    if (this.stats != null) {
      document.body.appendChild(this.stats.dom);
    }
    this.overlayElement = document.querySelector(".Overlay");
    this.overlayTextElement = document.querySelector(".OverlayText");
    let mainCanvas = document.querySelector(".MainCanvas");
    console.debug("Renderer wird initialisieren...");
    this.mainRenderer = new WebGLRenderer({
      canvas: mainCanvas
    });
    console.debug("Setzte Renderer device pixel ratio auf %f...", window.devicePixelRatio);
    this.mainRenderer.setPixelRatio(window.devicePixelRatio);
    console.debug("Setzte Renderer gr\xF6\xDFe auf %f x %f...", window.innerWidth, window.innerHeight);
    this.mainRenderer.setSize(window.innerWidth, window.innerHeight);
    console.debug("Bewege die Spieler-Kamera auf Z %f...", 30);
    this.playerCamera.position.setZ(30);
    console.debug("Erstelle einen Torus in der mitte von der Szene...");
    let geometry = new TorusGeometry(10, 3, 16, 100);
    let material = new MeshStandardMaterial({color: 16723968});
    this.torus = new Mesh(geometry, material);
    this.mainScene.add(this.torus);
    let x = 20;
    let y = 5;
    let z = 5;
    console.debug("Erstelle ein Punktlicht an %f, %f, %f mit der Farbe gelb...", x, y, z);
    let pointLight = new PointLight(16776960);
    pointLight.position.set(x, y, z);
    this.mainScene.add(pointLight);
    console.debug("Erstelle AmbientLight mit helligkeit 25%...");
    let ambientLight = new AmbientLight(16777215, 0.25);
    this.mainScene.add(ambientLight);
    console.debug("Erstell einen Helper f\xFCr das PointLight (damit dieses sichtbar ist)...");
    let lightHelper = new PointLightHelper(pointLight);
    this.mainScene.add(lightHelper);
    console.debug("Erstell GridHelper, damit die h\xF6he 0 angezeigt wird...");
    let gridHelper = new GridHelper(200, 50);
    this.mainScene.add(gridHelper);
    console.debug("F\xFCge Orbitalsteuerung hinzu...");
    this.orbitControls = new OrbitControls(this.playerCamera, this.mainRenderer.domElement);
    console.debug("F\xFCge FPS-Steuerung hinzu (deaktiviert)...");
    this.firstPersonControls = new FirstPersonControls(this.playerCamera, this.mainRenderer.domElement);
    this.firstPersonControls.Enabled = false;
    this.firstPersonControls.MouseLookSpeed = 5;
    this.firstPersonControls.MovementSpeed = 10;
    this.firstPersonControls.ControllerLookSpeed = 50;
    window.addEventListener("keydown", (event) => {
      if (event.code == "KeyQ") {
        console.debug("Leertaste wurde gedr\xFCckt. Wechsle die Sterungsart...");
        this.firstPersonControls.Enabled = this.firstPersonControls.Enabled == false;
        this.orbitControls.enabled = this.orbitControls.enabled == false;
        if (this.firstPersonControls.Enabled && document.pointerLockElement === null) {
          this.ShowOverlay("Klicken zum steuern...");
        } else {
          this.HideOverlay();
        }
        if (this.orbitControls.enabled) {
          document.exitPointerLock();
        }
      }
    });
    console.debug("F\xFCge 200 Sterne (Sph\xE4ren) an zuf\xE4lligen Koordinaten hinzu...");
    for (let i = 0; i < 200; i++) {
      this.AddStar();
    }
    let spaceTexture = new TextureLoader().load(document.location + "/space.jpg");
    this.mainScene.background = spaceTexture;
    let moonTexture = new TextureLoader().load(document.location + "/moon.jpg");
    let moonNormalTexture = new TextureLoader().load(document.location + "/normal.jpg");
    console.debug("F\xFCge einen Sph\xE4re mit Mond-Textur und -Noramltextur in der mitte der Szene hinzu...");
    let moon = new Mesh(new SphereGeometry(3, 32, 32), new MeshStandardMaterial({
      map: moonTexture,
      normalMap: moonNormalTexture
    }));
    moon.position.y = 20;
    this.mainScene.add(moon);
    const loader = new GLTFLoader();
    let scene = this.mainScene;
    loader.load(document.location + "/Roboter.glb", (gltf) => {
      scene.add(gltf.scene);
      this.robotBones = {
        Base: scene.getObjectByName("base"),
        Arm1: scene.getObjectByName("arm1"),
        Arm2: scene.getObjectByName("arm2"),
        Arm3: scene.getObjectByName("arm3"),
        Arm4: scene.getObjectByName("arm4"),
        Arm5: scene.getObjectByName("arm5")
      };
    }, void 0, function(error) {
      console.error(error);
    });
    console.debug("Starte die Gameloop...");
    this.GameLoop();
  }
  GameLoop() {
    var _a, _b, _c, _d;
    (_a = this.stats) == null ? void 0 : _a.begin();
    if (this.torus != null) {
      this.torus.rotation.x += 0.01;
      this.torus.rotation.y += 5e-3;
      this.torus.rotation.z += 0.01;
    }
    if (this.orbitControls != null && this.orbitControls.enabled) {
      (_b = this.orbitControls) == null ? void 0 : _b.update();
    }
    if (this.firstPersonControls != null && this.firstPersonControls.Enabled) {
      (_c = this.firstPersonControls) == null ? void 0 : _c.Update(this.clock.getDelta());
    }
    this.ApplyRobotControl();
    this.mainRenderer.render(this.mainScene, this.playerCamera);
    (_d = this.stats) == null ? void 0 : _d.end();
    requestAnimationFrame(() => {
      this.GameLoop();
    });
  }
  AddStar() {
    let geometry = new SphereGeometry(0.25);
    let material = new MeshStandardMaterial({color: 16777215});
    let star = new Mesh(geometry, material);
    star.position.set(MathUtils.randFloatSpread(100), MathUtils.randFloatSpread(100), MathUtils.randFloatSpread(100));
    this.mainScene.add(star);
  }
  ShowOverlay(text) {
    if (this.overlayElement == null || this.overlayTextElement == null) {
      throw new Error("Overlay-HTML-Element are null. Did you call Load()?");
    }
    this.overlayElement.classList.remove("Hide");
    this.overlayTextElement.innerText = text;
  }
  HideOverlay() {
    if (this.overlayElement == null || this.overlayTextElement == null) {
      throw new Error("Overlay-HTML-Element are null. Did you call Load()?");
    }
    this.overlayElement.classList.add("Hide");
    this.overlayTextElement.innerText = "";
  }
  BindRobotAxisKeys() {
    document.addEventListener("keydown", (event) => {
      this.HandleOnKeyDown(event);
    });
    document.addEventListener("keyup", (event) => {
      this.HandleOnKeyUp(event);
    });
  }
  HandleOnKeyDown(event) {
    switch (event.code) {
      case "KeyT":
        this.robotControl.Axis1 = 1;
        break;
      case "KeyG":
        this.robotControl.Axis1 = -1;
        break;
      case "KeyY":
        this.robotControl.Axis2 = 1;
        break;
      case "KeyH":
        this.robotControl.Axis2 = -1;
        break;
      case "KeyU":
        this.robotControl.Axis3 = 1;
        break;
      case "KeyJ":
        this.robotControl.Axis3 = -1;
        break;
      case "KeyI":
        this.robotControl.Axis4 = 1;
        break;
      case "KeyK":
        this.robotControl.Axis4 = -1;
        break;
      case "KeyO":
        this.robotControl.Axis5 = 1;
        break;
      case "KeyL":
        this.robotControl.Axis5 = -1;
        break;
      case "KeyP":
        this.robotControl.Axis6 = 1;
        break;
      case "Semicolon":
        this.robotControl.Axis6 = -1;
        break;
    }
  }
  HandleOnKeyUp(event) {
    switch (event.code) {
      case "KeyT":
      case "KeyG":
        this.robotControl.Axis1 = 0;
        break;
      case "KeyY":
      case "KeyH":
        this.robotControl.Axis2 = 0;
        break;
      case "KeyU":
      case "KeyJ":
        this.robotControl.Axis3 = 0;
        break;
      case "KeyI":
      case "KeyK":
        this.robotControl.Axis4 = 0;
        break;
      case "KeyO":
      case "KeyL":
        this.robotControl.Axis5 = 0;
        break;
      case "KeyP":
      case "Semicolon":
        this.robotControl.Axis6 = 0;
        break;
    }
  }
  ApplyRobotControl() {
    const multiplier = 0.01;
    if (this.robotBones != null) {
      this.robotBones.Base.applyQuaternion(new Quaternion(0, 0, this.robotControl.Axis1 * multiplier));
      this.robotBones.Arm1.applyQuaternion(new Quaternion(this.robotControl.Axis2 * multiplier, 0, 0));
      this.robotBones.Arm2.applyQuaternion(new Quaternion(0, 0, this.robotControl.Axis3 * multiplier));
      this.robotBones.Arm3.applyQuaternion(new Quaternion(0, this.robotControl.Axis4 * multiplier, 0));
      this.robotBones.Arm4.applyQuaternion(new Quaternion(0, 0, this.robotControl.Axis5 * multiplier));
      this.robotBones.Arm5.applyQuaternion(new Quaternion(0, this.robotControl.Axis6 * multiplier, 0));
    }
  }
}
let main = new Main();
setTimeout(() => {
  main.Load();
}, 0);
//# sourceMappingURL=index.af029163.js.map
