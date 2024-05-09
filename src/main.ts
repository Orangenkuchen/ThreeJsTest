import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as STATS from 'stats.js'
import { FirstPersonControls } from './FirstPersonControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Controls the animation rig bones of the robot.
 */
interface RobotBones
{
    /**
     * Rig bone for axis 1 (base of the robot; yaw)
     */
    Base: THREE.Bone;

    /**
     * Rig bone for axis 2 (first arm of the robot; pitch)
     */
    Arm1: THREE.Bone;

    /**
     * Rig bone for axis 3 (second arm of the robot; pitch)
     */
    Arm2: THREE.Bone;

    /**
     * Rig bone for axis 4 (second arm of the robot; rolling)
     */
    Arm3: THREE.Bone;

    /**
     * Rig bone for axis 5 (third arm of the robot; pitch)
     */
    Arm4: THREE.Bone;

    /**
     * Rig bone for axis 6 (third arm of the robot; rolling)
     */
    Arm5: THREE.Bone;
}

/**
 * Klasse für die Steuerung vom Roboter
 */
interface RobotControls
{
    /**
     * Steuern der ersten Achse (basis vom Roboter drehen)
     */
    Axis1: number;

    /**
     * Steuerung der zweiten Achse (erster Arm vertikal)
     */
    Axis2: number;

    /**
     * Steuerung der dritten Achse (zweiter Arm vertikal)
     */
    Axis3: number;

    /**
     * Steuerung der vierten Achse (zweiter Arm drehen)
     */
    Axis4: number;

    /**
     * Steuerung der fünften Achse (dritten Arm vertikal)
     */
    Axis5: number;

    /**
     * Steuerung der sechsten Achse (dritten Arm drehen)
     */
    Axis6: number;
}

/**
 * Hauptklasse von der Anwendung
 */
class Main
{
    // #region fields
    /**
     * Die Hauptszene
     */
    private readonly mainScene: THREE.Scene;

    /**
     * Die Kamera vom Spieler
     */
    private readonly playerCamera: THREE.PerspectiveCamera;

    /**
     * Statistiken über das Rendern
     */
    private readonly stats: STATS | null;

    /**
     * Object for keeping track of time
     */
    private readonly clock: THREE.Clock;

    /**
     * Object for keeping track of the control that will be applied to the axis of the robot
     */
    private readonly robotControl: RobotControls;

    /**
     * Holds the animation rig bones of the robot.
     */
    private robotBones: RobotBones | null;

    /**
     * The Overlay-HTML-Element over the canvas
     */
    private overlayElement: HTMLElement | null;

    /**
     * The Text being displayed in the canvas.
     */
    private overlayTextElement: HTMLParagraphElement | null;

    /**
     * Der pirmäre Renderer
     */
    private mainRenderer: THREE.WebGLRenderer;

    /**
     * Der Torus, welcher sind in der Mitte von der Szene befindet.
     */
    private torus: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial, THREE.Object3DEventMap> | null;

    /**
     * Steuerung um die Spieler-Kamera in einem Orbit um den 0 Punkt herum zu bewegen
     */
    private orbitControls: OrbitControls | null;

    /**
     * Steuerung um die Spieler-Kamera in First-Person zu bewegen.
     */
    private firstPersonControls: FirstPersonControls | null;
    // #endregion

    // #region ctor
    /**
     * Initialisiert die Klasse
     */
    public constructor()
    {
        this.stats = null;

        this.mainScene = new THREE.Scene();

        this.playerCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

        this.mainRenderer = new THREE.WebGLRenderer();

        try
        {
            this.stats = new STATS();
            this.stats.showPanel(0);
        }
        catch(error)
        {
            console.error("Error displaying Stats-Panel: %o", error);
        }

        this.clock = new THREE.Clock(true);

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

        document.addEventListener(
            "pointerlockchange", 
            (event: Event) =>
            {
                if (this.firstPersonControls && this.firstPersonControls.Enabled)
                {
                    if (document.pointerLockElement)
                    {
                        this.HideOverlay();
                    }
                    else
                    {
                        this.ShowOverlay("Klicken zum steuern...");
                    }
                }
            }, 
            false
        );
    }
    // #endregion

    // #region Load
    /**
     * Lädt die Szene und startet die Render-Loop
     */
    public Load()
    {
        console.info("Main.Load wurde aufgerufen...");

        if (this.stats != null)
        {
            document.body.appendChild(this.stats.dom);
        }

        this.overlayElement = <HTMLElement>document.querySelector(".Overlay");
        this.overlayTextElement = <HTMLParagraphElement>document.querySelector(".OverlayText");
        let mainCanvas = <HTMLCanvasElement>document.querySelector(".MainCanvas");

        console.debug("Renderer wird initialisieren...");
        this.mainRenderer = new THREE.WebGLRenderer(
            {
                canvas: mainCanvas
            }
        );
        console.debug("Setzte Renderer device pixel ratio auf %f...", window.devicePixelRatio);
        this.mainRenderer.setPixelRatio(window.devicePixelRatio);
        console.debug("Setzte Renderer größe auf %f x %f...", window.innerWidth, window.innerHeight);
        this.mainRenderer.setSize(window.innerWidth, window.innerHeight);

        console.debug("Bewege die Spieler-Kamera auf Z %f...", 30);
        this.playerCamera.position.setZ(30);

        console.debug("Erstelle einen Torus in der mitte von der Szene...");
        let geometry = new THREE.TorusGeometry( 10, 3, 16, 100 );
        let material = new THREE.MeshStandardMaterial( { color: 0xFF3000 } );
        this.torus = new THREE.Mesh( geometry, material );

        this.mainScene.add(this.torus);

        let x = 20;
        let y = 5;
        let z = 5;
        console.debug("Erstelle ein Punktlicht an %f, %f, %f mit der Farbe gelb...", x, y, z);
        let pointLight = new THREE.PointLight(0xFFFF00);
        pointLight.position.set(x, y, z);
        this.mainScene.add(pointLight);

        console.debug("Erstelle AmbientLight mit helligkeit 25%...");
        let ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.25);
        this.mainScene.add(ambientLight);

        console.debug("Erstell einen Helper für das PointLight (damit dieses sichtbar ist)...");
        let lightHelper = new THREE.PointLightHelper(pointLight);
        this.mainScene.add(lightHelper);

        console.debug("Erstell GridHelper, damit die höhe 0 angezeigt wird...");
        let gridHelper = new THREE.GridHelper(200, 50);
        this.mainScene.add(gridHelper);

        console.debug("Füge Orbitalsteuerung hinzu...");
        this.orbitControls = new OrbitControls(this.playerCamera, this.mainRenderer.domElement);

        console.debug("Füge FPS-Steuerung hinzu (deaktiviert)...");
        this.firstPersonControls = new FirstPersonControls(this.playerCamera, this.mainRenderer.domElement);
        this.firstPersonControls.Enabled = false;
        this.firstPersonControls.MouseLookSpeed = 5;
        this.firstPersonControls.MovementSpeed = 10;
        this.firstPersonControls.ControllerLookSpeed = 50;

        window.addEventListener(
            "keydown",
            (event) => {
                if (event.code == "KeyQ")
                {
                    console.debug("Leertaste wurde gedrückt. Wechsle die Sterungsart...");
                    this.firstPersonControls!.Enabled = this.firstPersonControls!.Enabled == false;
                    this.orbitControls!.enabled = this.orbitControls!.enabled == false;

                    if (this.firstPersonControls!.Enabled && document.pointerLockElement === null)
                    {
                        this.ShowOverlay("Klicken zum steuern...");
                    }
                    else
                    {
                        this.HideOverlay();
                    }

                    if (this.orbitControls!.enabled)
                    {
                        document.exitPointerLock();
                    }
                }
            }
        );

        console.debug("Füge 200 Sterne (Sphären) an zufälligen Koordinaten hinzu...");
        for (let i = 0; i < 200; i++)
        {
            this.AddStar();   
        }

        let spaceTexture = new THREE.TextureLoader().load(document.location + "/space.jpg");
        this.mainScene.background = spaceTexture;

        let moonTexture = new THREE.TextureLoader().load(document.location + "/moon.jpg");
        let moonNormalTexture = new THREE.TextureLoader().load(document.location + "/normal.jpg");

        console.debug("Füge einen Sphäre mit Mond-Textur und -Noramltextur in der mitte der Szene hinzu...");
        let moon = new THREE.Mesh(
            new THREE.SphereGeometry(3, 32, 32),
            new THREE.MeshStandardMaterial(
                {
                    map: moonTexture,
                    normalMap: moonNormalTexture
                }
            )
        );
        moon.position.y = 20;
        this.mainScene.add(moon);

        const loader = new GLTFLoader();

        let scene = this.mainScene;

        loader.load(document.location + "/Roboter.glb", ( gltf ) => {

            scene.add( gltf.scene );

            this.robotBones = {
                Base: <THREE.Bone<THREE.Object3DEventMap>>scene.getObjectByName("base"),
                Arm1: <THREE.Bone<THREE.Object3DEventMap>>scene.getObjectByName("arm1"),
                Arm2: <THREE.Bone<THREE.Object3DEventMap>>scene.getObjectByName("arm2"),
                Arm3: <THREE.Bone<THREE.Object3DEventMap>>scene.getObjectByName("arm3"),
                Arm4: <THREE.Bone<THREE.Object3DEventMap>>scene.getObjectByName("arm4"),
                Arm5: <THREE.Bone<THREE.Object3DEventMap>>scene.getObjectByName("arm5")
            };

        }, undefined, function ( error ) {

            console.error( error );

        } );

        console.debug("Starte die Gameloop...");
        this.GameLoop();
    }
    // #endregion

    // #region GameLoop
    /**
     * Die GameLoop, in welcher gerendert wird.
     */
    private GameLoop()
    {
        this.stats?.begin();
        if (this.torus != null)
        {
            this.torus.rotation.x += 0.01;
            this.torus.rotation.y += 0.005;
            this.torus.rotation.z += 0.01;
        }

        if (this.orbitControls != null && this.orbitControls.enabled)
        {
            this.orbitControls?.update();
        }
        if (this.firstPersonControls != null && this.firstPersonControls.Enabled)
        {
            this.firstPersonControls?.Update(this.clock.getDelta());
        }

        this.ApplyRobotControl();

        this.mainRenderer.render(this.mainScene, this.playerCamera);
        this.stats?.end();
    
        requestAnimationFrame(() => { this.GameLoop(); })
    }
    // #endregion

    // #region AddStar
    /**
     * Fügt eine Sphäre an eine zufällige Position in der Szene
     */
    private AddStar()
    {
        let geometry = new THREE.SphereGeometry(0.25);
        let material = new THREE.MeshStandardMaterial( { color: 0xFFFFFF });
        let star = new THREE.Mesh( geometry, material )

        star.position.set(
            THREE.MathUtils.randFloatSpread(100),
            THREE.MathUtils.randFloatSpread(100),
            THREE.MathUtils.randFloatSpread(100)
        );

        this.mainScene.add(star);
    }
    // #endregion

    // #region ShowOverlay
    /**
     * Displays the overlay with the specified Text
     * 
     * @param text The text to display
     * @throws {Error} Will be thrown if {@link Load} was not called yet
     */
    private ShowOverlay(text: string): void
    {
        if (this.overlayElement == null || this.overlayTextElement == null)
        {
            throw new Error("Overlay-HTML-Element are null. Did you call Load()?");
        }

        this.overlayElement.classList.remove("Hide");
        this.overlayTextElement.innerText = text;
    }
    // #endregion

    // #region HideOverlay
    /**
     * Hides the Overlay
     * 
     * @throws {Error} Will be thrown if {@link Load} was not called yet
     */
    private HideOverlay(): void
    {
        if (this.overlayElement == null || this.overlayTextElement == null)
        {
            throw new Error("Overlay-HTML-Element are null. Did you call Load()?");
        }

        this.overlayElement.classList.add("Hide");
        this.overlayTextElement.innerText = "";
    }
    // #endregion

    // #region BindRobotAxisKeys
    /**
     * Binds the Keyboard-Keys for the manipulation of the robot model.
     */
    private BindRobotAxisKeys(): void
    {
        document.addEventListener("keydown", (event) => { this.HandleOnKeyDown(event); });
        document.addEventListener("keyup", (event) => { this.HandleOnKeyUp(event); });
    }
    // #endregion

    // #region HandleOnKeyDown
    /**
     * Is called when a key the keyboard is pressed down
     * 
     * @param event The event args
     */
    private HandleOnKeyDown(event: KeyboardEvent): void
    {
        switch ( event.code )
        {
            case 'KeyT': 
                this.robotControl.Axis1 = 1.0; 
                break;

            case 'KeyG': 
                this.robotControl.Axis1 = -1.0; 
                break;

            case 'KeyY': 
                this.robotControl.Axis2 = 1.0; 
                break;

            case 'KeyH': 
                this.robotControl.Axis2 = -1.0; 
                break;

            case 'KeyU': 
                this.robotControl.Axis3 = 1.0; 
                break;

            case 'KeyJ': 
                this.robotControl.Axis3 = -1.0; 
                break;

            case 'KeyI': 
                this.robotControl.Axis4 = 1.0; 
                break;

            case 'KeyK': 
                this.robotControl.Axis4 = -1.0; 
                break;

            case 'KeyO': 
                this.robotControl.Axis5 = 1.0; 
                break;

            case 'KeyL': 
                this.robotControl.Axis5 = -1.0; 
                break;

            case 'KeyP': 
                this.robotControl.Axis6 = 1.0; 
                break;

            case 'Semicolon': 
                this.robotControl.Axis6 = -1.0; 
                break;
        }
    }
    // #endregion

    // #region HandleOnKeyUp
    /**
     * Is called when a key the keyboard is released
     * 
     * @param event The event args
     */
    private HandleOnKeyUp(event: KeyboardEvent): void
    {
        switch ( event.code )
        {
            case 'KeyT':
            case 'KeyG': 
                this.robotControl.Axis1 = 0; 
                break;

            case 'KeyY':
            case 'KeyH': 
                this.robotControl.Axis2 = 0; 
                break;

            case 'KeyU':
            case 'KeyJ': 
                this.robotControl.Axis3 = 0; 
                break;

            case 'KeyI':
            case 'KeyK': 
                this.robotControl.Axis4 = 0; 
                break;

            case 'KeyO':
            case 'KeyL': 
                this.robotControl.Axis5 = 0; 
                break;

            case 'KeyP':
            case 'Semicolon': 
                this.robotControl.Axis6 = 0; 
                break;

        }
    }
    // #endregion

    // #region ApplyRobotControl
    /**
     * Applies the modify values to the robot rig
     */
    private ApplyRobotControl(): void
    {
        const multiplier = 0.01;

        if (this.robotBones != null)
        {
            this.robotBones.Base.applyQuaternion(
                new THREE.Quaternion(
                    0,
                    0,
                    this.robotControl.Axis1 * multiplier
                )
            );

            this.robotBones.Arm1.applyQuaternion(
                new THREE.Quaternion(
                    this.robotControl.Axis2 * multiplier,
                    0,
                    0
                )
            );

            this.robotBones.Arm2.applyQuaternion(
                new THREE.Quaternion(
                    0,
                    0,
                    this.robotControl.Axis3 * multiplier
                )
            );

            this.robotBones.Arm3.applyQuaternion(
                new THREE.Quaternion(
                    0,
                    this.robotControl.Axis4 * multiplier,
                    0
                )
            );

            this.robotBones.Arm4.applyQuaternion(
                new THREE.Quaternion(
                    0,
                    0,
                    this.robotControl.Axis5 * multiplier,
                )
            );

            this.robotBones.Arm5.applyQuaternion(
                new THREE.Quaternion(
                    0,
                    this.robotControl.Axis6 * multiplier,
                    0
                )
            );
        }
    }
    // #endregion
}

let main = new Main();

setTimeout(() => { main.Load(); }, 0);


/*document.addEventListener(
    "resize", 
    () =>
    {
        mainRenderer.setSize(window.innerWidth, window.innerHeight);
    }
);*/