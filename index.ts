import { WALL_HIT } from "./types/types";
import { normalizeAngle, parseRads, getLengthBetween } from "./utils/utils.js";

const CANVAS_HEIGHT = 500;
const CANVAS_WIDTH = 500;
const FPS = 50;
const FOV = 60;
const MIDDLE_FOV = FOV / 2;
let WallTileImage: HTMLImageElement;
const textureHeight = 64;
const MiddleFovInRadians = parseRads(MIDDLE_FOV);
let msg: HTMLParagraphElement;
let text: HTMLParagraphElement;
let keys: HTMLParagraphElement;
let items: NodeListOf<HTMLImageElement>;
let moneyText: HTMLParagraphElement;
let wallInteractions = 0;
let interacting = false;
let actualMission = 0;
let moneyQuantity = 0;
let sprites: Sprite[] = [];
let zBuffer: number[] = [];

const BOARD = [
  [4, 4, 4, 4, 4, 4, 4, 1, 1, 4],
  [4, 0, 0, 0, 0, 0, 4, 1, 0, 3],
  [4, 0, 0, 0, 0, 0, 4, 1, 0, 2],
  [4, 0, 0, 0, 0, 0, 4, 1, 0, 1],
  [4, 0, 0, 0, 0, 0, 4, 4, 4, 4],
  [4, 4, 0, 4, 4, 0, 0, 0, 0, 4],
  [4, 5, 0, 5, 4, 0, 0, 0, 0, 4],
  [4, 4, 0, 4, 4, 0, 0, 0, 0, 4],
  [4, 5, 0, 5, 4, 0, 0, 0, 0, 4],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

class Level {
  private canvas: HTMLCanvasElement;
  arr: number[][];
  TILE_HEIGHT: number;
  TILE_WIDTH: number;

  constructor(canvas: HTMLCanvasElement, arr: number[][]) {
    this.canvas = canvas;
    this.arr = [...arr];
    this.TILE_HEIGHT = Math.floor(this.canvas.height / this.arr.length);
    this.TILE_WIDTH = Math.floor(this.canvas.width / this.arr[0].length);
  }

  isColition(y: number, x: number) {
    if (this.arr[y][x] !== 0) {
      return true;
    } else {
      return false;
    }
  }

  tile(x: number, y: number) {
    let xTile = Math.floor(x / this.TILE_WIDTH);
    let yTile = Math.floor(y / this.TILE_HEIGHT);
    return this.arr[yTile][xTile];
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

  constructor(
    ctx: CanvasRenderingContext2D,
    game: Level,
    x: number,
    y: number
  ) {
    this.ctx = ctx;
    this.game = game;
    this.x = x;
    this.y = y;
    this.moving = 0; // <- 0 = Parado, 1 = adelante, -1 = atrás
    this.spin = 0; // <- 1 = Giro izq, -1 = Giro derecha
    this.rotationAngle = 0;
    this.moveVelocity = 3; //Pixeles
    this.spinVelocity = 2 * (Math.PI / 180); //Grados
    const rayQuantity = 500;
    this.rays = [];

    const angleIncrement = parseRads(FOV / rayQuantity);
    const initialAngle = parseRads(this.rotationAngle - MIDDLE_FOV);
    let rayAngle = initialAngle;

    for (let i = 0; i < rayQuantity; i++) {
      this.rays.push(new Ray(ctx, game, x, y, this.rotationAngle, rayAngle, i));
      rayAngle += angleIncrement;
    }
  }

  draw() {
    this.updatePosition();
    for (let i = 0; i < this.rays.length; i++) {
      this.rays[i].draw();
    }
  }

  moveUp(isKeyPressed: boolean) {
    isKeyPressed ? (this.moving = 1) : (this.moving = 0);
  }

  moveDown(isKeyPressed: boolean) {
    isKeyPressed ? (this.moving = -1) : (this.moving = 0);
  }

  spinLeft(isKeyPressed: boolean) {
    isKeyPressed ? (this.spin = -1) : (this.spin = 0);
  }

  spinRight(isKeyPressed: boolean) {
    isKeyPressed ? (this.spin = 1) : (this.spin = 0);
  }

  updatePosition() {
    let newXPosition =
      this.x + this.moving * (Math.cos(this.rotationAngle) * this.moveVelocity);
    let newYPosition =
      this.y + this.moving * (Math.sin(this.rotationAngle) * this.moveVelocity);

    const NEXT_TILE_X = Math.floor(newXPosition / this.game.TILE_WIDTH);
    const NEXT_TILE_Y = Math.floor(newYPosition / this.game.TILE_HEIGHT);
    if (!this.game.isColition(NEXT_TILE_Y, NEXT_TILE_X)) {
      this.x = newXPosition;
      this.y = newYPosition;
    }
    this.rotationAngle += this.spin * this.spinVelocity;
    this.rotationAngle = normalizeAngle(this.rotationAngle);

    for (let i = 0; i < this.rays.length; i++) {
      this.rays[i].x = this.x;
      this.rays[i].y = this.y;
      this.rays[i].setAngle(this.rotationAngle);
    }

    //INTERACCIONES DEL USUARIO
    if (
      !interacting &&
      ((this.x > 400 && this.x < 450 && this.y > 50 && this.y < 100) ||
        (this.x > 200 && this.x < 250 && this.y > 100 && this.y < 150) ||
        (this.x > 100 && this.x < 150 && this.y > 350 && this.y < 400) ||
        (this.x > 400 && this.x < 450 && this.y > 350 && this.y < 400))
    ) {
      msg.textContent = "Presioná 'E' para interactuar";
    } else {
      msg.textContent = "";
    }

    if (
      this.rotationAngle > Math.PI + Math.PI / 4 &&
      this.rotationAngle < 2 * Math.PI - Math.PI / 4 &&
      this.game.arr[4][8] === 4 &&
      this.x > 400 &&
      this.x < 450 &&
      this.y > 250 &&
      this.y < 300
    ) {
      msg.textContent = "Suena hueco";
    }
  }
}

class Ray {
  private ctx: CanvasRenderingContext2D;
  private game: Level;
  x: number;
  y: number;
  private angle: number;
  private playerAngle: number;
  private angleIncrement: number;
  private column: number;
  private distance: number;
  private xIntercept: number;
  private yIntercept: number;
  private raySeekingDown: boolean;
  private raySeekingLeft: boolean;
  private yStep: number;
  private xStep: number;
  private wallHit: WALL_HIT;
  private texturePixel: number;
  private textureId: number;

  constructor(
    ctx: CanvasRenderingContext2D,
    game: Level,
    x: number,
    y: number,
    playerAngle: number,
    angleIncrement: number,
    column: number
  ) {
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
    this.raySeekingDown = false;
    this.raySeekingLeft = false;
    this.wallHit = {
      x: 0,
      y: 0,
      xHorizontal: 0,
      yHorizontal: 0,
      xVertical: 0,
      yVertical: 0,
    };
    this.texturePixel = 0;
    this.textureId = 0;
  }

  setAngle(angle: number) {
    this.playerAngle = angle;
    this.angle = normalizeAngle(angle + this.angleIncrement);
  }

  cast() {
    this.xIntercept = 0;
    this.yIntercept = 0;
    this.xStep = 0;
    this.yStep = 0;
    this.raySeekingDown = false;
    this.raySeekingLeft = false;

    //Ver en que direccion está el rayo
    if (this.angle < Math.PI && this.angle > 0) this.raySeekingDown = true;
    if (this.angle > Math.PI / 2 && this.angle < 3 * (Math.PI / 2))
      this.raySeekingLeft = true;

    //COLISIONES HORIZONTALES
    let horizontalIntercept = false;

    //Busco primera intersección horizontal
    this.yIntercept =
      Math.floor(this.y / this.game.TILE_HEIGHT) * this.game.TILE_HEIGHT;
    //Si apunta para abajo incremento un tile
    if (this.raySeekingDown) this.yIntercept += this.game.TILE_HEIGHT;

    let xDistance = (this.yIntercept - this.y) / Math.tan(this.angle);
    this.xIntercept = this.x + xDistance;

    this.yStep = this.game.TILE_HEIGHT;

    this.xStep = this.yStep / Math.tan(this.angle);

    //Verifico coherencia entre la direccion y el signo del valor
    if (!this.raySeekingDown) this.yStep = -this.yStep;
    if (
      (this.raySeekingLeft && this.xStep > 0) ||
      (!this.raySeekingLeft && this.xStep < 0)
    )
      this.xStep = -this.xStep;

    let nextXHorizontal = this.xIntercept;
    let nextYHorizontal = this.yIntercept;
    if (!this.raySeekingDown) nextYHorizontal--;

    while (
      !horizontalIntercept &&
      nextXHorizontal >= 0 &&
      nextYHorizontal >= 0 &&
      nextXHorizontal < 500 &&
      nextYHorizontal < 500
    ) {
      let xTile = Math.floor(nextXHorizontal / this.game.TILE_HEIGHT);
      let yTile = Math.floor(nextYHorizontal / this.game.TILE_HEIGHT);

      if (this.game.isColition(yTile, xTile)) {
        horizontalIntercept = true;
        this.wallHit.xHorizontal = nextXHorizontal;
        this.wallHit.yHorizontal = nextYHorizontal;
      } else {
        nextYHorizontal += this.yStep;
        nextXHorizontal += this.xStep;
      }
    }

    //COLISIONES VERTICALES
    let verticalIntercept = false;

    //Busco primera intersección horizontal
    this.xIntercept =
      Math.floor(this.x / this.game.TILE_HEIGHT) * this.game.TILE_HEIGHT;
    //Si apunta para abajo incremento un tile
    if (!this.raySeekingLeft) this.xIntercept += this.game.TILE_HEIGHT;

    let yDistance = (this.xIntercept - this.x) * Math.tan(this.angle);
    this.yIntercept = this.y + yDistance;

    this.xStep = this.game.TILE_HEIGHT;

    this.yStep = this.xStep * Math.tan(this.angle);

    //Verifico coherencia entre la direccion y el signo del valor
    if (
      (this.raySeekingDown && this.yStep < 0) ||
      (!this.raySeekingDown && this.yStep > 0)
    )
      this.yStep *= -1;
    if (
      (this.raySeekingLeft && this.xStep > 0) ||
      (!this.raySeekingLeft && this.xStep < 0)
    )
      this.xStep *= -1;

    let nextXVertical = this.xIntercept;
    let nextYVertical = this.yIntercept;
    if (this.raySeekingLeft) nextXVertical--;

    while (
      !verticalIntercept &&
      nextXVertical >= 0 &&
      nextYVertical >= 0 &&
      nextXVertical < 500 &&
      nextYVertical < 500
    ) {
      let xTile = Math.floor(nextXVertical / this.game.TILE_HEIGHT);
      let yTile = Math.floor(nextYVertical / this.game.TILE_HEIGHT);

      if (this.game.isColition(yTile, xTile)) {
        verticalIntercept = true;
        this.wallHit.xVertical = nextXVertical;
        this.wallHit.yVertical = nextYVertical;
      } else {
        nextYVertical += this.yStep;
        nextXVertical += this.xStep;
      }
    }

    //VERIFICO QUE COLISION ESTÁ MÁS PROXIMA
    let horizontalInterceptLength = 9999;
    let verticalInterceptLength = 9999;

    if (horizontalIntercept) {
      horizontalInterceptLength = getLengthBetween(
        this.x,
        this.y,
        this.wallHit.xHorizontal,
        this.wallHit.yHorizontal
      );
    }
    if (verticalIntercept) {
      verticalInterceptLength = getLengthBetween(
        this.x,
        this.y,
        this.wallHit.xVertical,
        this.wallHit.yVertical
      );
    }

    if (horizontalInterceptLength < verticalInterceptLength) {
      this.wallHit.x = this.wallHit.xHorizontal;
      this.wallHit.y = this.wallHit.yHorizontal;
      this.distance = horizontalInterceptLength;

      const xTile = Math.floor(this.wallHit.x / this.game.TILE_WIDTH);
      this.texturePixel = this.wallHit.x - xTile * this.game.TILE_WIDTH;
    } else if (verticalInterceptLength < horizontalInterceptLength) {
      this.wallHit.x = this.wallHit.xVertical;
      this.wallHit.y = this.wallHit.yVertical;
      this.distance = verticalInterceptLength;

      const yTile = Math.floor(this.wallHit.y / this.game.TILE_HEIGHT);
      this.texturePixel = this.wallHit.y - yTile * this.game.TILE_HEIGHT;
    }

    this.textureId = this.game.tile(this.wallHit.x, this.wallHit.y);

    //CORRECCION OJO DE PEZ
    this.distance = this.distance * Math.cos(this.playerAngle - this.angle);

    zBuffer[this.column] = this.distance;
  }

  renderWall() {
    const TILE_FULL_HEIGHT = this.ctx.canvas.height;
    const projectionDistance = TILE_FULL_HEIGHT / 2 / Math.tan(MIDDLE_FOV);
    const wallHeight = (TILE_FULL_HEIGHT / this.distance) * projectionDistance;

    const y0 = Math.floor(TILE_FULL_HEIGHT / 2) - Math.floor(wallHeight / 2);
    const y1 = y0 + wallHeight;
    const x = this.column;

    //DIBUJAR PAREDES CON TEXTURAS
    const imageHeight = y1 - y0;

    this.ctx.imageSmoothingEnabled = false;

    this.ctx.drawImage(
      WallTileImage,
      this.texturePixel,
      textureHeight * (this.textureId - 1),
      1,
      textureHeight,
      this.column,
      y0,
      1,
      imageHeight
    );

    //Pinto el cielo
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, y1);
    this.ctx.strokeStyle = "#8EC5FC";
    this.ctx.stroke();

    //Pinto el suelo
    this.ctx.beginPath();
    this.ctx.moveTo(x, y0);
    this.ctx.lineTo(x, TILE_FULL_HEIGHT);
    this.ctx.strokeStyle = "#2F2F2F";
    this.ctx.stroke();
  }

  draw() {
    this.cast();
    this.renderWall();
  }
}

class Sprite {
  private x: number;
  private y: number;
  private image: HTMLImageElement;
  distance: number;
  private visible: boolean;
  private player: Player;
  private xLength: number;
  private yLength: number;
  constructor(x: number, y: number, image: HTMLImageElement, player: Player) {
    this.x = x;
    this.y = y;
    this.image = image;
    this.distance = 0;
    this.visible = false;
    this.player = player;
    this.xLength = 0;
    this.yLength = 0;
  }

  calculateAngle() {
    this.xLength = this.x - this.player.x;
    this.yLength = this.y - this.player.y;

    const objectPlayerAngle = Math.atan2(this.yLength, this.xLength);
    let angleDifference = this.player.rotationAngle - objectPlayerAngle;

    if (angleDifference < -1 * Math.PI) angleDifference += 2 * Math.PI;
    if (angleDifference > Math.PI) angleDifference -= 2 * Math.PI;

    angleDifference = Math.abs(angleDifference);

    if (angleDifference < MiddleFovInRadians) this.visible = true;
    else this.visible = false;
  }

  calculateDistance() {
    this.distance = getLengthBetween(
      this.player.x,
      this.player.y,
      this.x,
      this.y
    );
  }

  updateData() {
    this.calculateAngle();
    this.calculateDistance();
  }

  draw() {
    this.updateData();

    if (this.visible) {
      const TILE_HEIGHT = 500;
      const projectionDistance = TILE_HEIGHT / 2 / Math.tan(MIDDLE_FOV);

      const spriteHeight = (TILE_HEIGHT / this.distance) * projectionDistance;

      const y0 = Math.floor(TILE_HEIGHT / 2) - Math.floor(spriteHeight / 2);
      const y1 = y0 + spriteHeight;

      const localTextureHeight = y0 - y1;
      const localTextureWidth = localTextureHeight;

      const viewDistance = CANVAS_WIDTH;

      const spriteAngle =
        Math.atan2(this.yLength, this.xLength) - this.player.rotationAngle;
      const x0 = Math.tan(spriteAngle) * viewDistance;
      const x = CANVAS_WIDTH / 2 + x0 - localTextureWidth / 2;

      this.player.ctx.imageSmoothingEnabled = false;
      const columnWidth = localTextureHeight / textureHeight;

      for (let i = 0; i < textureHeight; i++) {
        for (let j = 0; j < columnWidth; j++) {
          const x1 = Math.floor(x + (i - 1) * columnWidth + j);
          if (zBuffer[x1] > this.distance) {
            this.player.ctx.drawImage(
              this.image,
              i,
              0,
              1,
              textureHeight,
              x1,
              y1,
              1,
              localTextureHeight
            );
          }
        }
      }
    }
  }
}

let easterEggSprite: HTMLImageElement;
let introductionPjSprite: HTMLImageElement;
let vegetableSprite: HTMLImageElement;
let greengrocerSprite: HTMLImageElement;
let computerSprite: HTMLImageElement;

function initSprites(player: Player) {
  //CARGO SPRITES
  easterEggSprite = new Image();
  easterEggSprite.src = "assets/sprites/sprite-yo-sentado.png";

  introductionPjSprite = new Image();
  introductionPjSprite.src = "assets/sprites/sprite-yo-completo.png";

  vegetableSprite = new Image();
  vegetableSprite.src = "assets/sprites/sprite-verduras.png";

  greengrocerSprite = new Image();
  greengrocerSprite.src = "assets/sprites/verdulero.png";

  computerSprite = new Image();
  computerSprite.src = "assets/sprites/sprite-compu.png";

  //CREAMOS LOS OBJETOS PARA LAS IMÁGENES
  sprites[0] = new Sprite(435, 75, easterEggSprite, player);
  sprites[1] = new Sprite(225, 125, introductionPjSprite, player);
  sprites[2] = new Sprite(100, 225, vegetableSprite, player);
  sprites[3] = new Sprite(150, 225, vegetableSprite, player);
  sprites[4] = new Sprite(125, 375, greengrocerSprite, player);
  sprites[5] = new Sprite(425, 375, computerSprite, player);
}

function renderSprites() {
  sprites.sort(function (obj1: Sprite, obj2: Sprite) {
    return obj2.distance - obj1.distance;
  });

  //DIBUJAMOS LOS SPRITES UNO POR UNO
  for (let a = 0; a < sprites.length; a++) {
    sprites[a].draw();
  }
}

function clearCanvas(canvas: HTMLCanvasElement) {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
}

function principal(canvas: HTMLCanvasElement, game: Level, player: Player) {
  clearCanvas(canvas);
  player.draw();
  renderSprites();
}

function init() {
  localStorage.setItem("purchasedProducts", JSON.stringify([]));
  localStorage.setItem("userMoney", JSON.stringify(6000));
  //Crear canvas, e instancia de level y player
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  msg = document.getElementById("msg") as HTMLParagraphElement;
  text = document.getElementById("text") as HTMLParagraphElement;
  keys = document.getElementById("keys") as HTMLParagraphElement;
  moneyText = document.getElementById("money") as HTMLParagraphElement;
  items = document.querySelectorAll(
    "#bar-item"
  ) as NodeListOf<HTMLImageElement>;
  const channel = new BroadcastChannel("commerce");

  setTimeout(() => {
    keys.textContent = "";
  }, 5000);

  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const game = new Level(canvas, BOARD);
  const player = new Player(ctx, game, 100, 100);

  initSprites(player);
  //Listener de keyboard
  document.addEventListener("keydown", function (e) {
    switch (e.code) {
      case "KeyW":
        if (!interacting) player.moveUp(true);
        break;
      case "KeyA":
        if (!interacting) player.spinLeft(true);
        break;
      case "KeyS":
        if (!interacting) player.moveDown(true);
        break;
      case "KeyD":
        if (!interacting) player.spinRight(true);
        break;
      case "KeyE":
        //Easter egg
        if (
          !interacting &&
          player.rotationAngle > Math.PI + Math.PI / 4 &&
          player.rotationAngle < 2 * Math.PI - Math.PI / 4 &&
          game.arr[4][8] === 4 &&
          player.x > 400 &&
          player.x < 450 &&
          player.y > 250 &&
          player.y < 300
        ) {
          switch (wallInteractions) {
            case 0:
              game.arr[4][8] = 0;
              text.textContent =
                "¿Qué hacés acá?, me agarraste arreglando un bug. regenero la pared, chau.";
              wallInteractions++;
              break;
            case 1:
              game.arr[4][8] = 0;
              text.textContent =
                "¿Otra vez vos?, ¡No se puede trabajar así loco, andate!";
              wallInteractions++;
              break;
            case 2:
              game.arr[4][8] = 0;
              text.textContent =
                "¿Vos no tenés nada mejor que hacer? ¡Ultimo aviso!";
              wallInteractions++;
              break;
            case 3:
              game.arr[4][8] = 0;
              text.textContent =
                "Jajajaja, ¿te gusta romper paredes?, ¡ROMPAMOSLAS TODAS ENTONCES!";
              wallInteractions++;
              break;
          }
          setTimeout(() => {
            if (wallInteractions === 4) {
              player.x = 435;
              player.y = 100;
              player.rotationAngle = normalizeAngle(3 * (Math.PI / 2));
              text.textContent = "";
              for (let i = 0; i < game.arr.length; i++) {
                for (let j = 0; j < game.arr[0].length; j++) {
                  game.arr[i][j] = 0;
                }
              }
              text.textContent = "¡¡¡¡¡¡AJAJAJAJAJAJ!!!!!!";
              wallInteractions = 0;
              setTimeout(() => {
                text.textContent =
                  "¿Querés molestar? Molestá en LinkedIn, capaz hasta me conseguís un trabajo.";
              }, 3000);
              setTimeout(() => {
                window.location.href = "https://www.linkedin.com/in/uri-aguero";
              }, 7000);
            } else {
              player.x = 425;
              player.y = 300;
              text.textContent = "";
              game.arr[4][8] = 4;
            }
          }, 4000);
        }

        //Quest de comprar
        if (
          !interacting &&
          player.x > 200 &&
          player.x < 250 &&
          player.y > 100 &&
          player.y < 150
        ) {
          interacting = true;
          if (actualMission === 1) {
            text.textContent =
              "Yo sabía que te ibas a olvidar, 2kg de NextJS, 300gr de Tailwind y una coca, dale.";
            setTimeout(() => {
              text.textContent = "";
              interacting = false;
            }, 4000);
          } else if (actualMission === 2) {
            for (let i = 0; i < items.length; i++) {
              items[i].style.visibility = "hidden";
            }
            text.textContent =
              "Gracias... No te sobró plata? fua como aumenta todo loco.";

            setTimeout(() => {
              text.textContent = "Dame cinco segundos";
            }, 4000);

            setTimeout(() => {
              text.textContent =
                "Listo, junté todo, me tomé la coca y apareció una web, re loco, ya metí deploy en vercel y todo.";
              actualMission = 3;
            }, 8000);

            setTimeout(() => {
              text.textContent =
                "Quedó buenisima. En la PC de la siguiente habitación la podes mirar... Una cosa más";
            }, 12000);

            setTimeout(() => {
              text.textContent =
                "Se escuchan ruidos de teclas atrás de las paredes, no se que sea... Tené cuidado.";
            }, 16000);

            setTimeout(() => {
              actualMission = 3;
              text.textContent = "";
              interacting = false;
            }, 20000);
          } else if (actualMission === 3) {
            text.textContent =
              "Pero para un poooco, ¿cuantos dialogos queres que tenga?";

            setTimeout(() => {
              text.textContent =
                "La PC ya debe haber prendido, andá a fijarte.";
            }, 4000);

            setTimeout(() => {
              text.textContent = "";
              interacting = false;
            }, 8000);
          } else {
            text.textContent =
              "No puede ser, me enfoqué tanto en este jueguito que me olvide de hacer un portfolio.";

            setTimeout(() => {
              text.textContent =
                "Rápido, ayudame a hacer uno. Necesito que compres los ingredientes.";
            }, 4000);
            setTimeout(() => {
              text.textContent =
                "Toma $6000. Traeme 2kg de NextJS, 300gr de Tailwind y una coca.";
              moneyQuantity = 6000;
              moneyText.textContent = `$ ${moneyQuantity}`;
            }, 8000);
            setTimeout(() => {
              actualMission = 1;
              text.textContent = "";
              interacting = false;
            }, 12000);
          }
        }

        //Mercader
        if (
          !interacting &&
          player.x > 100 &&
          player.x < 150 &&
          player.y > 350 &&
          player.y < 400
        ) {
          interacting = true;
          switch (actualMission) {
            case 1:
              text.textContent =
                "¿Todo bien? Ya terminé de descargar, vení. Elegí lo que necesites.";

              setTimeout(() => {
                text.textContent = "";
                window.open(
                  "./pages/commerce/commerce.html",
                  "_blank",
                  `width=${window.screen.width / 3},height=${
                    window.screen.height
                  }, right=0`
                );
                interacting = false;
              }, 4000);
              break;
            case 2:
              text.textContent =
                "¿Otra vez vos? ya está loco cuanto queres comprar.";

              setTimeout(() => {
                text.textContent = "";
                interacting = false;
              }, 4000);
              break;
            default:
              text.textContent =
                "Estoy descargando la mercadería, volvé en un ratito.";
              setTimeout(() => {
                text.textContent = "";
                interacting = false;
              }, 4000);
              break;
          }
        }

        //PC
        if (
          !interacting &&
          player.x > 400 &&
          player.x < 450 &&
          player.y > 350 &&
          player.y < 400
        ) {
          interacting = true;
          switch (actualMission) {
            case 3:
              text.textContent =
                "Sentite contento, la web que me ayudaste a hacer quedó linda, mirá.";

              setTimeout(() => {
                text.textContent = "";
                window.open(
                  "https://urielaguero.vercel.app/",
                  "_blank",
                  `width=${window.screen.width},height=${window.screen.height}, right=0`
                );
                interacting = false;
              }, 4000);
              break;
            default:
              text.textContent =
                "Se esta iniciando el sistema operativo, andá a hacer otras cosas mientras porque está re lenta";
              setTimeout(() => {
                text.textContent = "";
                interacting = false;
              }, 4000);
              break;
          }
        }

        break;
    }
  });
  document.addEventListener("keyup", function (e) {
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
  channel.onmessage = (event) => {
    switch (event.data.type) {
      case "interact":
        interacting = event.data.isInteract;
        break;
      case "money":
        moneyQuantity = event.data.money;
        moneyText.textContent = `$ ${moneyQuantity}`;
        items[event.data.product].style.visibility = "visible";
        const actualItems: string[] = JSON.parse(
          localStorage.getItem("purchasedProducts") || "[]"
        );
        actualItems.push(event.data.title);
        localStorage.setItem("purchasedProducts", JSON.stringify(actualItems));
        break;
      case "mission":
        actualMission = event.data.missionNumber;
        break;
    }
  };

  WallTileImage = new Image();
  WallTileImage.src = "assets/walls-custom.png";

  setInterval(() => principal(canvas, game, player), 1000 / FPS);
}

init();
