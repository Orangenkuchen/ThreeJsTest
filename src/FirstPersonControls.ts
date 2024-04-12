import { MathUtils, Spherical, Vector3 } from 'three';
import * as THREE from 'three';

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

    private ViewHalfX: number;

    private ViewHalfY: number;

    private latitude: number;

    private longitude: number;

    /**
     * Indicates if the control to move forward is pressed.
     */
    private MoveForwardPressed: boolean;

    /**
     * Indicates if the control to move backwards is pressed.
     */
    private MoveBackwardPressed: boolean;

    /**
     * Indicates if the control to move left is pressed.
     */
    private MoveLeftPressed: boolean;

    /**
     * Indicates if the control to move right is pressed.
     */
    private MoveRightPressed: boolean;

    /**
     * Indicates if the control to move upwards is pressed.
     */
    private MoveUpwardsPressed: boolean;

    /**
     * Indicates if the control to move downwards is pressed.
     */
    private MoveDownwardsPressed: boolean;

    /**
     * The x movement of the mouse since the last mouse movement event
     */
    private MouseMovementX: number;

    /**
     * The y movement of the mouse since the last mouse movement event
     */
    private MouseMovementY: number;

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

        this.Enabled = true;
        this.MovementSpeed = 1.0;
        this.LookSpeed = 0.005;

        this.ViewHalfX = 0;
        this.ViewHalfY = 0;

        this.MoveForwardPressed = false;
        this.MoveBackwardPressed = false;
        this.MoveLeftPressed = false;
        this.MoveRightPressed = false;
        this.MoveUpwardsPressed = false;
        this.MoveDownwardsPressed = false;

        this.MouseMovementX = 0;
        this.MouseMovementY = 0;

        this.longitude = 0;
        this.latitude = 0;

        this.HeightSpeed = false;
        this.HeightCoefficient = 1.0;
        this.HeightMin = 0.0;
        this.HeightMax = 1.0;

        this.AutoSpeedFactor = 0.0;

        this.AutoForward = false;

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

    // #region LookSpeed
    /**
     * The speed of looking around with the mouse.
     */
    public LookSpeed: number;
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
        this.MouseMovementX = event.movementX;
        this.MouseMovementY = event.movementY;
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
                this.MoveForwardPressed = true; 
                break;

            case 'ArrowLeft':
            case 'KeyA':
                this.MoveLeftPressed = true;
                break;

            case 'ArrowDown':
            case 'KeyS':
                this.MoveBackwardPressed = true;
                break;

            case 'ArrowRight':
            case 'KeyD':
                this.MoveRightPressed = true;
                break;

            case 'ShiftLeft':
                this.MoveDownwardsPressed = true;
                break;

            case 'Space':
                this.MoveUpwardsPressed = true;
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
                this.MoveForwardPressed = false; 
                break;

            case 'ArrowLeft':
            case 'KeyA':
                this.MoveLeftPressed = false;
                break;

            case 'ArrowDown':
            case 'KeyS':
                this.MoveBackwardPressed = false;
                break;

            case 'ArrowRight':
            case 'KeyD':
                this.MoveRightPressed = false;
                break;

            case 'ShiftLeft':
                this.MoveDownwardsPressed = false;
                break;

            case 'Space':
                this.MoveUpwardsPressed = false;
                break;

        }
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

    private SetOrientation(): void
    {
        const quaternion = this.object.quaternion;

        this.lookDirection.set(0, 0, - 1).applyQuaternion(quaternion);
        this.spherical.setFromVector3( this.lookDirection );

        this.latitude = 90 - MathUtils.radToDeg( this.spherical.phi );
        this.longitude = MathUtils.radToDeg( this.spherical.theta );
    }

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

        if (this.MoveForwardPressed || (this.AutoForward && this.MoveBackwardPressed == false ))
        {
            this.object.translateZ(-(actualMoveSpeed + this.AutoSpeedFactor));
        }

        if (this.MoveBackwardPressed)
        {
            this.object.translateZ(actualMoveSpeed);
        }

        if (this.MoveLeftPressed)
        {
            this.object.translateX(-actualMoveSpeed);
        }

        if (this.MoveRightPressed)
        {
            this.object.translateX(actualMoveSpeed);
        }

        if (this.MoveUpwardsPressed)
        {
            this.object.translateY(actualMoveSpeed);
        }

        if (this.MoveDownwardsPressed) 
        {
            this.object.translateY(-actualMoveSpeed);
        }

        let actualLookSpeed = clockDelta * this.LookSpeed;

        if (this.ActiveLook == false)
        {
            actualLookSpeed = 0;
        }

        let verticalLookRatio = 1;

        if (this.ConstrainVertical)
        {
            verticalLookRatio = Math.PI / (this.VerticalMax - this.VerticalMin);
        }

        this.longitude -= this.MouseMovementX * actualLookSpeed;
        if ( this.LookVertical )
        {
            this.latitude -= this.MouseMovementY * actualLookSpeed * verticalLookRatio;
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
        this.MouseMovementX = 0;
        this.MouseMovementY = 0;
    }
    // #endregion

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
