import { WALL_HIT } from "./types/types";

const CANVAS_HEIGHT = 500;
const CANVAS_WIDTH = 500;
const FPS = 50;
const WALL_COLOR = "#000";
const FLOOR_COLOR = "#c7c7c7";
const PLAYER_COLOR = "#FF0000";
const FOV = 60;
const MIDDLE_FOV = FOV / 2;
let WallTileImage: HTMLImageElement;
const textureHeight = 64;
const textureWidth = 64;
const FovInRadians = parseRads(FOV);
const MiddleFovInRadians = parseRads(MIDDLE_FOV);
let ray;
let tiles;
let armorImg;
let plantImg;
let bubbleImg;
let sprites: Sprite[] = [];
let zBuffer: number[] = [];

//ME GUSTARÍA VER SI SE PUEDE VARIAR LAS MEDIDAS DEL TABLERO
//HAY QUE DINAMIZAR LAS VARIABLES DE WIDTH Y HEIGTH 
//HAY QUE CAMBIAR LA CANTIDAD DE RAYOS, DE 500 A LA CANTIDAD DE PX DEL CANVAS
const FIRST_LEVEL = [
  [3,3,3,3,3,3,3,3,3,3],
  [3,0,0,0,3,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,3],
  [3,3,3,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,3],
  [3,0,3,0,0,0,3,0,0,3],
  [3,0,3,0,0,0,0,0,0,3],
  [3,3,3,3,3,3,3,3,3,3]
]

function normalizeAngle(angle:number){
  angle = angle % (2 * Math.PI);
  if(angle < 0){
    angle += 2 * Math.PI;
  }
  return angle;
}

function parseRads(angle:number){
  angle = angle * (Math.PI / 180);
  return angle;
}

function getLengthBetween(x1:number, y1:number, x2:number, y2:number){
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

class Level {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private arr: number[][];
  TILE_HEIGHT: number;
  TILE_WIDTH: number;

  constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, arr: number[][]){
    this.ctx = ctx
    this.canvas = canvas
    this.arr = [...arr]
    this.TILE_HEIGHT = Math.floor(this.canvas.height / this.arr.length);
    this.TILE_WIDTH = Math.floor(this.canvas.width / this.arr[0].length);
  }

  isColition(y: number, x: number){
    if(this.arr[y][x] !== 0){
      return true;
    }else{
      return false;
    }
  }

  tile(x: number, y: number){
    let xTile = Math.floor(x/this.TILE_WIDTH);
    let yTile = Math.floor(y/this.TILE_HEIGHT);
    return this.arr[yTile][xTile];
  }

  draw(){
    for(let y=0; y<this.arr.length; y++){
      for(let x=0; x<this.arr[0].length; x++){
        this.ctx.fillStyle = this.arr[y][x] == 0 ? FLOOR_COLOR : localStorage.getItem("bg") || "#000";
        this.ctx.fillRect(x * this.TILE_WIDTH, y * this.TILE_HEIGHT, this.TILE_WIDTH, this.TILE_HEIGHT);
      }
    }
  }
}

class Player {
  ctx: CanvasRenderingContext2D;
  private game: Level;
  x: number;
  y: number;
  private moving: number;
  private spin: number;
  rotationAngle: number; 
  private moveVelocity: number; 
  private spinVelocity: number; 
  private rays: Ray[];
  mode: string;

  constructor(ctx: CanvasRenderingContext2D, game: Level, x: number, y: number, mode: string){
    this.ctx = ctx;
    this.game = game;
    this.mode = mode;
    this.x = x;
    this.y = y;
    this.moving = 0; // <- 0 = Parado, 1 = adelante, -1 = atrás
    this.spin = 0;  // <- 1 = Giro izq, -1 = Giro derecha
    this.rotationAngle = 0;
    this.moveVelocity = 3; //Pixeles
    this.spinVelocity = 2 * (Math.PI / 180); //Grados
    const rayQuantity = 500;
    this.rays = [];
    
    const angleIncrement = parseRads(FOV / rayQuantity);
    const initialAngle = parseRads(this.rotationAngle - MIDDLE_FOV);
    let rayAngle = initialAngle;

    for(let i=0; i<rayQuantity; i++){
      this.rays.push(new Ray(ctx, game, x, y, this.rotationAngle, rayAngle, i, this.mode));
      rayAngle += angleIncrement;
    }
  }

  draw(){
    this.updatePosition();
    for(let i=0; i<this.rays.length; i++){
      this.rays[i].draw();
    }
    //Dibujar player
    if(this.mode === "2d"){
      this.ctx.fillStyle = PLAYER_COLOR;
      this.ctx.fillRect(this.x - 3, this.y - 3, 6, 6);
    }

    //Dibujar linea guia "Tangente"
    // const xDestiny = this.x + (Math.cos(this.rotationAngle) * 40);
    // const yDestiny = this.y + (Math.sin(this.rotationAngle) * 40);

    // this.ctx.beginPath();
    // this.ctx.moveTo(this.x, this.y);
    // this.ctx.lineTo(xDestiny, yDestiny);
    // this.ctx.strokeStyle = "#000";
    // this.ctx.stroke();

    //Dibujar linea guia "Y"
    // this.ctx.beginPath();
    // this.ctx.moveTo(xDestiny, yDestiny);
    // this.ctx.lineTo(xDestiny, this.y);
    // this.ctx.strokeStyle = "#FF0000";
    // this.ctx.stroke();

    //Dibujar linea guia "X"
    // this.ctx.beginPath();
    // this.ctx.moveTo(this.x, this.y);
    // this.ctx.lineTo(xDestiny, this.y);
    // this.ctx.strokeStyle = "#FF00E0";
    // this.ctx.stroke();
  }

  moveUp(isKeyPressed: boolean){
    isKeyPressed ? this.moving = 1 : this.moving = 0;
  }

  moveDown(isKeyPressed: boolean){
    isKeyPressed ? this.moving = -1 : this.moving = 0;
  }

  spinLeft(isKeyPressed: boolean){
    isKeyPressed ? this.spin = -1 : this.spin = 0;
  }

  spinRight(isKeyPressed: boolean){
    isKeyPressed ? this.spin = 1 : this.spin = 0;
  }


  updatePosition(){    
    let newXPosition = this.x + this.moving * (Math.cos(this.rotationAngle) * this.moveVelocity)
    let newYPosition = this.y + this.moving * (Math.sin(this.rotationAngle) * this.moveVelocity)

    const NEXT_TILE_X = Math.floor(newXPosition / this.game.TILE_WIDTH);
    const NEXT_TILE_Y = Math.floor(newYPosition / this.game.TILE_HEIGHT);
    if(!this.game.isColition(NEXT_TILE_Y, NEXT_TILE_X)){
      this.x = newXPosition;
      this.y = newYPosition;
    }
    this.rotationAngle += this.spin * this.spinVelocity;
		this.rotationAngle = normalizeAngle(this.rotationAngle);
    

    for(let i=0; i<this.rays.length; i++){
      this.rays[i].x = this.x;
      this.rays[i].y = this.y;
      this.rays[i].setAngle(this.rotationAngle);
    }
  }
}

class Ray {
  private ctx: CanvasRenderingContext2D;
  private game: Level;
  x: number
  y: number
  private angle: number
  private playerAngle: number
  private angleIncrement: number
  private column: number
  private distance: number
  private xIntercept: number;
  private yIntercept: number;
  private raySeekingDown: boolean;
  private raySeekingLeft: boolean;
  private yStep: number;
  private xStep: number;
  private wallHit: WALL_HIT;
  private mode: string;
  private texturePixel: number;
  private textureId: number;

  constructor(ctx:CanvasRenderingContext2D, game:Level, x:number, y:number, playerAngle:number, angleIncrement:number, column:number, mode: string ){
    this.ctx = ctx;
    this.game = game;
    this.x = x;
    this.y = y;
    this.angleIncrement = angleIncrement;
    this.playerAngle = playerAngle;
    this.angle = this.playerAngle + this.angleIncrement;
    this.column = column;
    this.distance = 0;
    this.xIntercept = 0;
    this.yIntercept = 0;
    this.xStep = 0;
    this.yStep = 0;
    this.raySeekingDown = false
    this.raySeekingLeft = false
    this.mode = mode
    this.wallHit = {
      x: 0,
      y: 0,
      xHorizontal: 0,
      yHorizontal: 0,
      xVertical: 0,
      yVertical: 0,
    }
    this.texturePixel = 0;
    this.textureId = 0;
  }

  setAngle(angle:number){
		this.playerAngle = angle;
		this.angle = normalizeAngle(angle + this.angleIncrement);
	}

  cast(){

    this.xIntercept = 0;
    this.yIntercept = 0;
    this.xStep = 0;
    this.yStep = 0;
    this.raySeekingDown = false
    this.raySeekingLeft = false

    //Ver en que direccion está el rayo
    if(this.angle < Math.PI && this.angle > 0) this.raySeekingDown = true;
    if(this.angle > (Math.PI / 2) && this.angle < (3 * (Math.PI/2))) this.raySeekingLeft = true;
    
    //COLISIONES HORIZONTALES
    let horizontalIntercept = false

    //Busco primera intersección horizontal
    this.yIntercept = Math.floor(this.y/this.game.TILE_HEIGHT) * this.game.TILE_HEIGHT;
    //Si apunta para abajo incremento un tile
    if(this.raySeekingDown) this.yIntercept += this.game.TILE_HEIGHT;

    let xDistance = ((this.yIntercept - this.y)/Math.tan(this.angle));
    this.xIntercept = this.x + xDistance;

    this.yStep = this.game.TILE_HEIGHT
    
    this.xStep = this.yStep / Math.tan(this.angle)

    //Verifico coherencia entre la direccion y el signo del valor
    if(!this.raySeekingDown) this.yStep = -this.yStep
    if((this.raySeekingLeft && this.xStep > 0) || (!this.raySeekingLeft && this.xStep < 0)) this.xStep = -this.xStep;

    let nextXHorizontal = this.xIntercept;
    let nextYHorizontal = this.yIntercept; 
    if(!this.raySeekingDown) nextYHorizontal--;
    
    while(!horizontalIntercept && (nextXHorizontal>=0 && nextYHorizontal>=0 && nextXHorizontal < 500 && nextYHorizontal < 500)){
      let xTile = Math.floor(nextXHorizontal/this.game.TILE_HEIGHT);
      let yTile = Math.floor(nextYHorizontal/this.game.TILE_HEIGHT);

      if(this.game.isColition(yTile, xTile)){
        horizontalIntercept = true;
        this.wallHit.xHorizontal = nextXHorizontal;
        this.wallHit.yHorizontal = nextYHorizontal;
      }else{
        nextYHorizontal += this.yStep;
        nextXHorizontal += this.xStep;
      }
    }


    //COLISIONES VERTICALES
    let verticalIntercept = false

    //Busco primera intersección horizontal
    this.xIntercept = Math.floor(this.x/this.game.TILE_HEIGHT) * this.game.TILE_HEIGHT;
    //Si apunta para abajo incremento un tile
    if(!this.raySeekingLeft) this.xIntercept += this.game.TILE_HEIGHT;

    let yDistance = ((this.xIntercept - this.x) * Math.tan(this.angle));
    this.yIntercept = this.y + yDistance;

    this.xStep = this.game.TILE_HEIGHT
    
    this.yStep = this.xStep * Math.tan(this.angle)

    //Verifico coherencia entre la direccion y el signo del valor
    if((this.raySeekingDown && this.yStep < 0) || (!this.raySeekingDown && this.yStep > 0)) this.yStep *= -1;
    if((this.raySeekingLeft && this.xStep > 0) || (!this.raySeekingLeft && this.xStep < 0)) this.xStep *= -1;

    let nextXVertical = this.xIntercept;
    let nextYVertical = this.yIntercept; 
    if(this.raySeekingLeft) nextXVertical--;
    
    //CAMBIAR LOS 500 POR CANVAS ALTO Y CANVAS ANCHO VARIABLES
    while(!verticalIntercept && (nextXVertical>=0 && nextYVertical>=0 && nextXVertical < 500 && nextYVertical < 500)){
      let xTile = Math.floor(nextXVertical/this.game.TILE_HEIGHT);
      let yTile = Math.floor(nextYVertical/this.game.TILE_HEIGHT);

      if(this.game.isColition(yTile, xTile)){
        verticalIntercept = true;
        this.wallHit.xVertical = nextXVertical;
        this.wallHit.yVertical = nextYVertical;
      }else{
        nextYVertical += this.yStep;
        nextXVertical += this.xStep;
      }
    }

    //VERIFICO QUE COLISION ESTÁ MÁS PROXIMA
    let horizontalInterceptLength = 9999;
    let verticalInterceptLength = 9999;

    if(horizontalIntercept){
      horizontalInterceptLength = getLengthBetween(this.x, this.y, this.wallHit.xHorizontal, this.wallHit.yHorizontal);
    }
    if(verticalIntercept){
      verticalInterceptLength = getLengthBetween(this.x, this.y, this.wallHit.xVertical, this.wallHit.yVertical);
    }
    
    if(horizontalInterceptLength < verticalInterceptLength){
      this.wallHit.x = this.wallHit.xHorizontal;
      this.wallHit.y = this.wallHit.yHorizontal;
      this.distance = horizontalInterceptLength;

      const xTile = Math.floor(this.wallHit.x/this.game.TILE_WIDTH);
      this.texturePixel = this.wallHit.x - (xTile * this.game.TILE_WIDTH);
    }else if(verticalInterceptLength < horizontalInterceptLength){
      this.wallHit.x = this.wallHit.xVertical;
      this.wallHit.y = this.wallHit.yVertical;
      this.distance = verticalInterceptLength;
      
      const yTile = Math.floor(this.wallHit.y/this.game.TILE_HEIGHT);
      this.texturePixel = this.wallHit.y - (yTile * this.game.TILE_HEIGHT);
    }

    this.textureId = this.game.tile(this.wallHit.x, this.wallHit.y);

    //CORRECCION OJO DE PEZ
    this.distance = this.distance * (Math.cos(this.playerAngle - this.angle));

    zBuffer[this.column] = this.distance;
  }

  renderWall(){

    const TILE_FULL_HEIGHT = this.ctx.canvas.height
    const projectionDistance = (TILE_FULL_HEIGHT/2)/Math.tan(MIDDLE_FOV);
    const wallHeight = (TILE_FULL_HEIGHT/this.distance)*projectionDistance;

    const y0 = Math.floor(TILE_FULL_HEIGHT/2) - Math.floor(wallHeight/2)
    const y1 = y0 + wallHeight;
    const x = this.column

    //DIBUJAR PAREDES CON TEXTURASs
    const imageHeight = y1-y0;

    this.ctx.imageSmoothingEnabled = false;

    this.ctx.drawImage(
      WallTileImage,
      this.texturePixel,
      textureHeight * this.textureId,
      1,
      textureHeight,
      this.column,
      y0,
      1,
      imageHeight,
    )

    //DIBUJAR PAREDES EN GRIS
    // this.ctx.beginPath()
    // this.ctx.moveTo(x, y1)
    // this.ctx.lineTo(x, y0)
    // this.ctx.strokeStyle = "#191919"
    // this.ctx.stroke()

    //Pinto el cielo
    this.ctx.beginPath()
    this.ctx.moveTo(x, 0)
    this.ctx.lineTo(x, y1)
    this.ctx.strokeStyle = "#5D9BD9"
    this.ctx.stroke()

    //Pinto el suelo
    this.ctx.beginPath()
    this.ctx.moveTo(x, y0)
    this.ctx.lineTo(x, TILE_FULL_HEIGHT)
    this.ctx.strokeStyle = "#86410E"
    this.ctx.stroke()
    
  }

  draw(){
    this.cast();
    //Dibujar linea guia
    if(this.mode === "3d"){
      this.renderWall()
    }else if(this.mode === "2d"){
      const xDistance = this.wallHit.x;
      const yDistance = this.wallHit.y;
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.x, this.y);
      this.ctx.lineTo(xDistance, yDistance);
      this.ctx.strokeStyle = "#FF0000";
      this.ctx.stroke();
    }
  }
}



class Sprite{
  private x: number;
  private y: number;
  private image: HTMLImageElement;
  distance: number;
  private angle: number;
  private visible: boolean;
  private player: Player;
  private xLength: number;
  private yLength: number;
  constructor(x: number, y: number, image: HTMLImageElement, player: Player){
    this.x = x;
    this.y = y;
    this.image = image;
    this.distance = 0;
    this.angle = 0;
    this.visible = false
    this.player = player;
    this.xLength = 0;
    this.yLength = 0;
  }

  calculateAngle(){
    this.xLength = this.x - this.player.x;
    this.yLength = this.y - this.player.y;

    const objectPlayerAngle = Math.atan2(this.yLength, this.xLength);
    let angleDifference = this.player.rotationAngle - objectPlayerAngle;
  
    if(angleDifference < (-1 * Math.PI))
      angleDifference += 2 * Math.PI;
    if(angleDifference > Math.PI)
      angleDifference -= 2 * Math.PI;

    angleDifference = Math.abs(angleDifference);

    if(angleDifference < MiddleFovInRadians)
      this.visible = true;
    else
      this.visible = false;
  }

  calculateDistance(){
    this.distance =  getLengthBetween(this.player.x, this.player.y, this.x, this.y);
  }

  updateData(){
    this.calculateAngle();
    this.calculateDistance();
  }

  draw(){
    this.updateData();
    //EL ERROR ESTA EN ESTE CODIGO
    
    if(this.visible){
      const TILE_HEIGHT = 500;
      const projectionDistance = (TILE_HEIGHT/2)/Math.tan(MIDDLE_FOV);

      const spriteHeight = (TILE_HEIGHT/this.distance) * projectionDistance;

      
      const y0 = Math.floor(TILE_HEIGHT/2) - Math.floor(spriteHeight/2);
      const y1 = y0 + spriteHeight;
      //   const y0 = Math.floor(TILE_FULL_HEIGHT/2) - Math.floor(wallHeight/2)
      // const y1 = y0 + wallHeight;
      // const x = this.column

      const localTextureHeight = y0 - y1;
      const localTextureWidth = localTextureHeight;
      //distancia plano proyeccion, quiero cambiarlo por el de arriba y ver que pasa
      const viewDistance = CANVAS_WIDTH;

      const spriteAngle = Math.atan2(this.yLength, this.xLength) - this.player.rotationAngle;
      const x0 = Math.tan(spriteAngle) * viewDistance;
      const x = CANVAS_WIDTH/2 + x0 - localTextureWidth/2;

      this.player.ctx.imageSmoothingEnabled = false;
      const columnWidth = localTextureHeight / textureHeight;

      for(let i=0; i<textureHeight; i++){
        //EL BUCLE RENDERIZA LOS COMENTARIOS ACÁ PERO NO FUNCIONA EL SIGUIENTE
        for(let j = 0; j<columnWidth; j++){
          const x1 = Math.floor(x+((i-1)*columnWidth)+j)
          if(zBuffer[x1] > this.distance){
            this.player.ctx.drawImage(
              this.image,
              i,
              0,
              1,
              textureHeight,
              x1,
              y1,
              1,
              localTextureHeight,
            );
          }
        }
      }
    }
  }


}

function initSprites(player: Player){
  //CARGAMOS SPRITES
  
  plantImg = new Image();
  plantImg.src = "assets/yo.png";
  
  //CREAMOS LOS OBJETOS PARA LAS IMÁGENES
  sprites[0] = new Sprite(370,225,plantImg, player);
}

function renderSprites(){
	 
	 
	//NOTA: HACER EL ALGORITMO DE ORDENACIÓN MANUAL
	 
	//ALGORITMO DE ORDENACIÓN SEGÚN DISTANCIA (ORDEN DESCENDENTE)
	//https://davidwalsh.name/array-sort

	sprites.sort(function(obj1: Sprite, obj2: Sprite) {
		// Ascending: obj1.distancia - obj2.distancia
		// Descending: obj2.distancia - obj1.distancia
		return obj2.distance - obj1.distance;
	});
	
	
	
	
	//DIBUJAMOS LOS SPRITES UNO POR UNO
	for(let a=0; a<sprites.length; a++){
		sprites[a].draw();
	}
  
}
 

function clearCanvas(canvas: HTMLCanvasElement){
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
}

function principal(canvas: HTMLCanvasElement, game: Level, player: Player){
  clearCanvas(canvas);
  if(player.mode === "2d") game.draw();
  player.draw();
  renderSprites();
}

function init(){
  localStorage.setItem("bg", "#000")
  //Crear canvas, e instancia de level y player
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;

  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const game = new Level(ctx, canvas, FIRST_LEVEL);
  const player = new Player(ctx, game, 100, 100, "3d");

  initSprites(player);
  //Listener de keyboard
  document.addEventListener("keydown", function(e){
    switch (e.code) {
      case "KeyW":
          player.moveUp(true);
        break;
      case "KeyA":
         player.spinLeft(true);
        break;
      case "KeyS":
         player.moveDown(true);
        break;
      case "KeyD":
         player.spinRight(true);
        break;
      case "Space":
        player.mode === "3d" ? player.mode = "2d" : player.mode = "3d";
        break;
      // case "KeyE":
      //    window.open(
      //     "http://127.0.0.1:5500/raycasting/config.html",
      //     "_blank",
      //     `width=600,height=600,left=${(window.screen.width - 600)/2},top=${(window.screen.height - 600)/2}`);
      //   break;
    }
  });
  document.addEventListener("keyup", function(e){
    switch (e.code) {
      case "KeyW":
        player.moveUp(false);
        break;
      case "KeyA":
        player.spinLeft(false);
        break;
      case "KeyS":
        player.moveDown(false);
        break;
      case "KeyD":
        player.spinRight(false);
        break;
    }
  });

  WallTileImage = new Image();
  WallTileImage.src = "assets/walls.png";

  setInterval(()=> principal(canvas, game, player), (1000/FPS));
}

init()