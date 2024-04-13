import { MathUtils, Spherical, Vector3 } from 'three';
import * as THREE from 'three';

/**
 * HashTable of gamepads
 */
interface GamePadHashTable
{
    [index: string]: Gamepad
}

/**
 * Provides First-Person-Contorls.
 */
export class FirstPersonControls
{
    // #region fields
    /**
     * Contains function that need to be called when the class is cleaned up.
     */
    private readonly cleanUpActions: Array<() => void>;

    /**
     * The camera of the player
     */
    private readonly object: THREE.Camera;

    /**
     * The canvas-HTMLElement that the scene is renderd to.
     */
    private readonly domElement: HTMLCanvasElement;

    /**
     * The direction the camera is looking at.
     */
    private readonly lookDirection: Vector3;

    /**
     * The last target the camera is looking at.
     */
    private readonly lookTarget: Vector3;

    private readonly spherical: Spherical;

    /**
     * HashTable of the connected gamepads
     */
    private readonly gamepadHashTable: GamePadHashTable;

    private ViewHalfX: number;

    private ViewHalfY: number;

    private latitude: number;

    private longitude: number;

    /**
     * The amount the player is moved in the x axis in the next {@link Update}.
     */
    private XMovement: number;

    /**
     * The amount the player is moved in the y axis in the next {@link Update}.
     */
    private YMovement: number;

    /**
     * The amount the player is moved in the z axis in the next {@link Update}.
     */
    private ZMovement: number;

    /**
     * The amount the controller axis for looking in the x direction is.
     */
    private controllerXLook: number;

    /**
     * The amount the controller axis for looking in the y direction is.
     */
    private controllerYLook: number;

    /**
     * The amount the mouse axis for looking in the x direction is.
     */
    private mouseXLook: number;

    /**
     * The amount the controller axis for looking in the y direction is.
     */
    private mouseYLook: number;

    private lookTargetPosition: Vector3;
    // #endregion

    // #region ctor
    /**
     * Initialiert die Klasse
     * 
     * @param object The camera of the player
     * @param domElement The canvas-HTMLElement that the scene is renderd to.
     */
    public constructor( object: THREE.Camera, domElement: HTMLCanvasElement )
    {
        this.cleanUpActions = new Array<() => void>();

        this.object = object;
        this.domElement = domElement;

        this.lookDirection = new Vector3();
        this.lookTarget = new Vector3();
        this.spherical = new Spherical();
        this.lookTargetPosition = new Vector3();

        this.gamepadHashTable = {};

        this.Enabled = true;
        this.MovementSpeed = 1.0;
        this.MouseLookSpeed = 0.005;
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
        this.HeightCoefficient = 1.0;
        this.HeightMin = 0.0;
        this.HeightMax = 1.0;

        this.AutoSpeedFactor = 0.0;

        this.AutoForward = false;
        this.UseController = true;

        this.ActiveLook = true;
        this.LookVertical = true;

        this.ConstrainVertical = false;
        this.VerticalMin = 0;
        this.VerticalMax = Math.PI;

        let contextMenuHandler = (event: Event) => { this.HandleOnContextMenu(event) };
        this.domElement.addEventListener( 'contextmenu', contextMenuHandler);
        this.cleanUpActions.push(() => { this.domElement.removeEventListener( 'contextmenu', contextMenuHandler); });

        let mouseMoveHandler = (event: MouseEvent) => { this.HandleOnMouseMove(event) };
        this.domElement.addEventListener( 'mousemove', mouseMoveHandler);
        this.cleanUpActions.push(() => { this.domElement.removeEventListener( 'mousemove', mouseMoveHandler); });

        let mouseDownHandler = (event: MouseEvent) => { this.HandleOnMouseDown(event) };
        this.domElement.addEventListener( 'mousedown', mouseDownHandler);
        this.cleanUpActions.push(() => { this.domElement.removeEventListener( 'mousedown', mouseDownHandler); });

        let mouseUpHandler = (event: MouseEvent) => { this.HandleOnMouseUp(event) };
        this.domElement.addEventListener( 'mouseup', mouseUpHandler);
        this.cleanUpActions.push(() => { this.domElement.removeEventListener( 'mouseup', mouseUpHandler); });

        let keyboardKeyDownHandler = (event: KeyboardEvent) => { this.HandleOnKeyDown(event) };
        window.addEventListener( 'keydown', keyboardKeyDownHandler);
        this.cleanUpActions.push(() => { window.removeEventListener( 'keydown', keyboardKeyDownHandler); });

        let keyboardKeyUpHandler = (event: KeyboardEvent) => { this.HandleOnKeyUp(event) };
        window.addEventListener( 'keyup', keyboardKeyUpHandler);
        this.cleanUpActions.push(() => { window.removeEventListener( 'keyup', keyboardKeyUpHandler); });

        let gamepadConnectedHandler = (event: GamepadEvent) => { this.HandleOnControllerConnected(event) };
        window.addEventListener( 'gamepadconnected', gamepadConnectedHandler);
        this.cleanUpActions.push(() => { window.removeEventListener( 'gamepadconnected', gamepadConnectedHandler); });

        let gamepadDisconnectedHandler = (event: GamepadEvent) => { this.HandleOnControllerDisconnected(event) };
        window.addEventListener( 'gamepaddisconnected', gamepadDisconnectedHandler);
        this.cleanUpActions.push(() => { window.removeEventListener( 'gamepaddisconnected', gamepadDisconnectedHandler); });

        this.HandleResize();
        this.SetOrientation();
    }
    // #endregion

    // #region Enabled
    /**
     * Controls if this first-person-control are active.
     */
    public Enabled: boolean;
    // #endregion

    // #region MovementSpeed
    /**
     * The movement speed of the player.
     */
    public MovementSpeed: number;
    // #endregion

    // #region MouseLookSpeed
    /**
     * The speed of looking around with the mouse.
     */
    public MouseLookSpeed: number;
    // #endregion

    // #region ControllerLookSpeed
    /**
     * The speed of looking around with the controller.
     */
    public ControllerLookSpeed: number;
    // #endregion

    public HeightSpeed: boolean;

    public HeightCoefficient: number;

    public HeightMin: number;

    public HeightMax: number;

    public AutoSpeedFactor: number;

    public AutoForward: boolean;

    public ActiveLook: boolean;

    public ConstrainVertical: boolean;

    public VerticalMin: number;

    public VerticalMax: number;

    public LookVertical: boolean;

    public UseController: boolean;

    // #region Dispose
    /**
     * Cleans up the class
     */
    public Dispose()
    {
        for (let cleanUpAction of this.cleanUpActions)
        {
            cleanUpAction();
        }
        this.cleanUpActions.length = 0;
    }
    // #endregion

    // #region LookAt
    /**
     * Truns the camera to look at the target
     * 
     * @param vector The vector to look at
     */
    public LookAt(vector: THREE.Vector3): void;

    /**
     * Truns the camera to look at the target
     * 
     * @param x The x coordinate to look at
     * @param y The y coordinate to look at
     * @param z The z coordinate to look at
     */
    public LookAt(x: number, y: number, z: number): void;

    public LookAt(xOrVector: THREE.Vector3 | number, yOrUndefined?: number, zOrUndefined?: number): void
    {
        if (xOrVector instanceof THREE.Vector3)
        {
            this.lookTarget.copy(xOrVector);
        }
        else
        {
            
            this.lookTarget.set( xOrVector, <number>yOrUndefined, <number>zOrUndefined );
        }

        this.object.lookAt(this.lookTarget);

        this.SetOrientation();
    }
    // #endregion

    // #region Update
    /**
     * Updates the first person control for this game loop.
     * 
     * @param clockDelta The delta in milliseconds since the last game loop
     */
    public Update(clockDelta: number): void
    {
        if (this.Enabled === false)
        {
            return;
        }

        this.CheckAndProcessControllerInput();

        if (this.HeightSpeed)
        {
            const y = MathUtils.clamp( this.object.position.y, this.HeightMin, this.HeightMax );
            const heightDelta = y - this.HeightMin;

            this.AutoSpeedFactor = clockDelta * ( heightDelta * this.HeightCoefficient );
        }
        else
        {
            this.AutoSpeedFactor = 0.0;
        }

        const actualMoveSpeed = clockDelta * this.MovementSpeed;

        if (Math.abs(this.ZMovement) > 0  || this.AutoForward)
        {            
            this.object.translateZ((actualMoveSpeed + this.AutoSpeedFactor) * this.ZMovement);
        }

        if (Math.abs(this.XMovement) > 0)
        {
            this.object.translateX(actualMoveSpeed * this.XMovement);
        }

        if (Math.abs(this.YMovement) > 0)
        {
            this.object.translateY(actualMoveSpeed * this.YMovement);
        }

        let actualLookSpeed = clockDelta * this.MouseLookSpeed;

        if (this.ActiveLook == false)
        {
            actualLookSpeed = 0;
        }

        let verticalLookRatio = 1;

        if (this.ConstrainVertical)
        {
            verticalLookRatio = Math.PI / (this.VerticalMax - this.VerticalMin);
        }

        if (Math.abs(this.mouseXLook) > 0)
        {
            // Is subtracted, because the origin of the mouse is in the top-left corner.
            // Therefor it needs to be inverted
            this.longitude -= this.mouseXLook * actualLookSpeed;
        }
        if (Math.abs(this.controllerXLook) > 0)
        {
            this.longitude += this.controllerXLook * actualLookSpeed * this.ControllerLookSpeed;
        }

        if (this.LookVertical)
        {
            if (Math.abs(this.mouseYLook) > 0)
            {
                // Is subtracted, because the origin of the mouse is in the top-left corner.
                // Therefor it needs to be inverted
                this.latitude -= this.mouseYLook * actualLookSpeed * verticalLookRatio;
            }
            if (Math.abs(this.controllerYLook) > 0)
            {
                this.latitude += this.controllerYLook * actualLookSpeed * verticalLookRatio * this.ControllerLookSpeed;
            }
        }

        this.latitude = Math.max(-85, Math.min(85, this.latitude) );

        let phi = MathUtils.degToRad(90 - this.latitude);
        const theta = MathUtils.degToRad(this.longitude);

        if (this.ConstrainVertical)
        {
            phi = MathUtils.mapLinear(phi, 0, Math.PI, this.VerticalMin, this.VerticalMax);
        }

        const position = this.object.position;

        this.lookTargetPosition.setFromSphericalCoords( 1, phi, theta ).add( position );

        this.object.lookAt(this.lookTargetPosition);
        
        // Reset the mouse movement since it was processed.
        // Needs to be done because the mouse move event does not return movement 0, 0
        this.mouseXLook = 0;
        this.mouseYLook = 0;
    }
    // #endregion

    // #region HandleResize
    /**
     * Sets the height and with values of the view. Call this after an resize.
     */
    private HandleResize(): void
    {
        this.ViewHalfX = this.domElement.offsetWidth / 2;
        this.ViewHalfY = this.domElement.offsetHeight / 2;
    }
    // #endregion

    // #region HandleOnMouseDown
    /**
     * Is called, when the mouse button is pressed down on the canvas
     * 
     * @param event The eventargs
     */
    private HandleOnMouseDown(event: MouseEvent): void
    {
        event.preventDefault();

        if (document.pointerLockElement == this.domElement)
        {
            console.debug("The canvas already has the pointer lock.");
        }
        else
        {
            console.debug("The canvas does not jet have the pointer lock. Requesting...");
            this.domElement.requestPointerLock();
        }
    }
    // #endregion

    // #region HandleOnMouseUp
    /**
     * Is called, when the mouse button is release on the canvas
     * 
     * @param event The eventargs
     */
    private HandleOnMouseUp(event: MouseEvent): void
    {
        event.preventDefault();
    }
    // #endregion

    // #region HandleOnMouseMove
    /**
     * Is called when the mouse is moved on the canvas
     * 
     * @param event 
     */
    private HandleOnMouseMove(event: MouseEvent): void
    {
        this.mouseXLook = event.movementX;
        this.mouseYLook = event.movementY;
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
            case 'ArrowUp':
            case 'KeyW': 
                this.ZMovement = -1.0; 
                break;

            case 'ArrowLeft':
            case 'KeyA':
                this.XMovement = -1.0;
                break;

            case 'ArrowDown':
            case 'KeyS':
                this.ZMovement = 1.0;
                break;

            case 'ArrowRight':
            case 'KeyD':
                this.XMovement = 1.0;
                break;

            case 'ShiftLeft':
                this.YMovement = -1.0;
                break;

            case 'Space':
                this.YMovement = 1.0;
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
            case 'ArrowUp':
            case 'KeyW':
                this.ZMovement = 0;
                break;

            case 'ArrowLeft':
            case 'KeyA':
                this.XMovement = 0;
                break;

            case 'ArrowDown':
            case 'KeyS':
                this.ZMovement = 0;
                break;

            case 'ArrowRight':
            case 'KeyD':
                this.XMovement = 0;
                break;

            case 'ShiftLeft':
                this.YMovement = 0;
                break;

            case 'Space':
                this.YMovement = 0;
                break;

        }
    }
    // #endregion

    // #region HandleOnControllerConnected
    /**
     * Is called when a controller is connected
     * 
     * @param gamepadEvent The event args
     */
    public HandleOnControllerConnected(gamepadEvent: GamepadEvent): void
    {
        console.debug(
            "Gamepad connected at index %d: %s. %d buttons, %d axes.",
            gamepadEvent.gamepad.index,
            gamepadEvent.gamepad.id,
            gamepadEvent.gamepad.buttons.length,
            gamepadEvent.gamepad.axes.length
        );

        this.gamepadHashTable[gamepadEvent.gamepad.index] = gamepadEvent.gamepad;
    }
    // #endregion

    // #region HandleOnControllerDisconnected
    /**
     * Is called when a controller is disconnected
     * 
     * @param gamepadEvent The event args
     */
    public HandleOnControllerDisconnected(gamepadEvent: GamepadEvent): void
    {
        console.log(
            "Gamepad disconnected from index %d: %s",
            gamepadEvent.gamepad.index,
            gamepadEvent.gamepad.id,
        );

        delete this.gamepadHashTable[gamepadEvent.gamepad.index];
    }
    // #endregion

    // #region CheckAndProcessControllerInput
    /**
     * Checks if an input on a controller has changed and
     * processes it
     */
    public CheckAndProcessControllerInput(): void
    {
        const axisDeadZone = 0.05;
        let firstGamepad: Gamepad | null = null;

        for (let index in this.gamepadHashTable)
        {
            firstGamepad = this.gamepadHashTable[index];
            break;
        }

        if (firstGamepad != null)
        {
            let moveXAmount = firstGamepad.axes[0];
            let moveZAmount = firstGamepad.axes[1];
            let moveYAmount = 0;
            let lookXAmount = firstGamepad.axes[3];
            let lookYAmount = firstGamepad.axes[4];

            if (Math.abs(moveXAmount) < axisDeadZone)
            {
                moveXAmount = 0;
            }

            if (Math.abs(moveZAmount) < axisDeadZone)
            {
                moveZAmount = 0;
            }

            if (firstGamepad.buttons[11].pressed)
            {
                moveYAmount += -1;
            }

            if (firstGamepad.buttons[0].pressed)
            {
                moveYAmount += 1;
            }

            if (Math.abs(lookXAmount) < axisDeadZone)
            {
                lookXAmount = 0;
            }

            if (Math.abs(lookYAmount) < axisDeadZone)
            {
                lookYAmount = 0;
            }

            this.XMovement = moveXAmount;
            this.YMovement = moveYAmount;
            this.ZMovement = moveZAmount;

            this.controllerXLook = lookXAmount * -1;
            this.controllerYLook = lookYAmount * -1;
        }
    }
    // #endregion

    private SetOrientation(): void
    {
        const quaternion = this.object.quaternion;

        this.lookDirection.set(0, 0, - 1).applyQuaternion(quaternion);
        this.spherical.setFromVector3( this.lookDirection );

        this.latitude = 90 - MathUtils.radToDeg( this.spherical.phi );
        this.longitude = MathUtils.radToDeg( this.spherical.theta );
    }

    // #region HandleOnContextMenu
    /**
     * Is called when the context menu is opended.
     * Prevents the default Action
     * 
     * @param event The event args
     */
    private HandleOnContextMenu(event: Event)
    {
        debugger;
        event.preventDefault();
    }
    // #endregion
}
