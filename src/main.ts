import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as STATS from 'stats.js'
import { FirstPersonControls } from './FirstPersonControls';

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
    private readonly stats: STATS;

    /**
     * Object for keeping track of time
     */
    private readonly clock: THREE.Clock;

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
        this.mainScene = new THREE.Scene();

        this.playerCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

        this.mainRenderer = new THREE.WebGLRenderer();
        this.stats = new STATS();
        this.stats.showPanel(0);

        this.clock = new THREE.Clock(true);

        this.torus = null;

        this.orbitControls = null;
        this.firstPersonControls = null;

        this.overlayElement = null;
        this.overlayTextElement = null;

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

        document.body.appendChild(this.stats.dom);

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

        let spaceTexture = new THREE.TextureLoader().load("space.jpg");
        this.mainScene.background = spaceTexture;

        let moonTexture = new THREE.TextureLoader().load("moon.jpg");
        let moonNormalTexture = new THREE.TextureLoader().load("normal.jpg");

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
        this.mainScene.add(moon);

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
        this.stats.begin();
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

        this.mainRenderer.render(this.mainScene, this.playerCamera);
        this.stats.end();
    
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