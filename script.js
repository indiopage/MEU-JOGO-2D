const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const TABLE = {
    x: 45,
    y: 45,
    width: 910,
    height: 470
};

const BALL_RADIUS = 13;
const DIAMETER = BALL_RADIUS * 2;

const FRICTION = 0.992;
const WALL_BOUNCE = 0.88;
const BALL_BOUNCE = 0.96;

const STOP_SPEED = 0.045;

const MAX_SHOT_SPEED = 18;

const pockets = [
    { x: TABLE.x, y: TABLE.y },
    { x: TABLE.x + TABLE.width / 2, y: TABLE.y },
    { x: TABLE.x + TABLE.width, y: TABLE.y },

    { x: TABLE.x, y: TABLE.y + TABLE.height },
    { x: TABLE.x + TABLE.width / 2, y: TABLE.y + TABLE.height },
    { x: TABLE.x + TABLE.width, y: TABLE.y + TABLE.height }
];

// =====================================================
// ESTADO
// =====================================================

let balls = [];

let currentPlayer = 1;

let scores = {
    1: 0,
    2: 0
};

let aiming = false;
let power = 0;
let powerDirection = 1;

let shotInProgress = false;
let pocketedThisTurn = 0;
let gameOver = false;

let mouse = {
    x: 0,
    y: 0
};

// =====================================================
// CRIAR BOLAS
// =====================================================

function createBalls() {

    balls = [];

    // Bola branca
    balls.push({
        x: TABLE.x + 245,
        y: TABLE.y + TABLE.height / 2,

        vx: 0,
        vy: 0,

        color: "#ffffff",

        number: 0,
        type: "cue",

        pocketed: false
    });

    /*
        Formação:

                 preta
              azul  vermelho
           vermelho azul vermelho
        etc.

        Total:
        7 vermelhas
        7 azuis
        1 preta
    */

    const rack = [
        "red",

        "blue", "red",

        "red", "black", "blue",

        "blue", "red", "blue", "red",

        "red", "blue", "red", "blue", "red"
    ];

    const startX = TABLE.x + 660;
    const startY = TABLE.y + TABLE.height / 2;

    let index = 0;

    for (let row = 0; row < 5; row++) {

        for (let col = 0; col <= row; col++) {

            const type = rack[index];

            const x =
                startX +
                row * (BALL_RADIUS * 1.72);

            const y =
                startY -
                row * BALL_RADIUS * 0.86 +
                col * BALL_RADIUS * 1.72;

            let color = "#e63946";

            if (type === "blue") {
                color = "#2474ff";
            }

            if (type === "black") {
                color = "#111111";
            }

            balls.push({
                x,
                y,

                vx: 0,
                vy: 0,

                color,

                number: index + 1,
                type,

                pocketed: false
            });

            index++;
        }
    }
}

// =====================================================
// DESENHAR MESA
// =====================================================

function drawTable() {

    ctx.fillStyle = "#087044";

    ctx.fillRect(
        TABLE.x,
        TABLE.y,
        TABLE.width,
        TABLE.height
    );

    // Textura pixelada
    for (
        let x = TABLE.x;
        x < TABLE.x + TABLE.width;
        x += 16
    ) {

        for (
            let y = TABLE.y;
            y < TABLE.y + TABLE.height;
            y += 16
        ) {

            if ((x + y) % 32 === 0) {

                ctx.fillStyle =
                    "rgba(255,255,255,0.025)";

                ctx.fillRect(
                    x,
                    y,
                    8,
                    8
                );
            }
        }
    }

    // Madeira superior
    ctx.fillStyle = "#b96b2c";

    ctx.fillRect(
        TABLE.x - 18,
        TABLE.y - 18,
        TABLE.width + 36,
        18
    );

    // Madeira inferior
    ctx.fillRect(
        TABLE.x - 18,
        TABLE.y + TABLE.height,
        TABLE.width + 36,
        18
    );

    // Madeira esquerda
    ctx.fillRect(
        TABLE.x - 18,
        TABLE.y,
        18,
        TABLE.height
    );

    // Madeira direita
    ctx.fillRect(
        TABLE.x + TABLE.width,
        TABLE.y,
        18,
        TABLE.height
    );

    // Contorno
    ctx.strokeStyle = "#3b1c0c";
    ctx.lineWidth = 8;

    ctx.strokeRect(
        TABLE.x - 18,
        TABLE.y - 18,
        TABLE.width + 36,
        TABLE.height + 36
    );
}

// =====================================================
// CAÇAPAS
// =====================================================

function drawPockets() {

    for (const pocket of pockets) {

        ctx.beginPath();

        ctx.fillStyle = "#28150c";

        ctx.arc(
            pocket.x,
            pocket.y,
            28,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.beginPath();

        ctx.fillStyle = "#050505";

        ctx.arc(
            pocket.x,
            pocket.y,
            21,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}

// =====================================================
// DESENHAR BOLA
// =====================================================

function drawBall(ball) {

    if (ball.pocketed) return;

    // Sombra
    ctx.beginPath();

    ctx.fillStyle =
        "rgba(0,0,0,0.35)";

    ctx.arc(
        ball.x + 3,
        ball.y + 4,
        BALL_RADIUS,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Bola
    ctx.beginPath();

    ctx.fillStyle = ball.color;

    ctx.arc(
        ball.x,
        ball.y,
        BALL_RADIUS,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Contorno
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3;

    ctx.stroke();

    // Brilho
    ctx.fillStyle =
        "rgba(255,255,255,0.65)";

    ctx.fillRect(
        ball.x - 6,
        ball.y - 7,
        4,
        4
    );

    // Número
    if (ball.number > 0) {

        ctx.fillStyle =
            ball.type === "black"
                ? "#ffffff"
                : "#ffffff";

        ctx.font =
            "bold 8px Arial";

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
            ball.number,
            ball.x,
            ball.y
        );
    }
}

// =====================================================
// MIRA
// =====================================================

function drawAim() {

    const cue = balls[0];

    if (
        !cue ||
        cue.pocketed ||
        shotInProgress
    ) {
        return;
    }

    const dx =
        mouse.x - cue.x;

    const dy =
        mouse.y - cue.y;

    const distance =
        Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) return;

    const nx = dx / distance;
    const ny = dy / distance;

    // Linha de mira
    ctx.save();

    ctx.setLineDash([8, 8]);

    ctx.strokeStyle =
        "rgba(255,255,255,0.6)";

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(
        cue.x,
        cue.y
    );

    ctx.lineTo(
        cue.x + nx * 280,
        cue.y + ny * 280
    );

    ctx.stroke();

    ctx.restore();

    // Taco
    const stickDistance =
        50 + power * 60;

    const stickX =
        cue.x - nx * stickDistance;

    const stickY =
        cue.y - ny * stickDistance;

    ctx.strokeStyle = "#d9a15f";
    ctx.lineWidth = 6;

    ctx.beginPath();

    ctx.moveTo(
        stickX - nx * 180,
        stickY - ny * 180
    );

    ctx.lineTo(
        stickX,
        stickY
    );

    ctx.stroke();

    drawPowerBar();
}

// =====================================================
// BARRA DE FORÇA
// =====================================================

function drawPowerBar() {

    const width = 220;
    const height = 16;

    const x =
        canvas.width / 2 - width / 2;

    const y =
        canvas.height - 25;

    ctx.fillStyle = "#111";

    ctx.fillRect(
        x,
        y,
        width,
        height
    );

    let color = "#42ff63";

    if (power > 0.6) {
        color = "#ffd93d";
    }

    if (power > 0.85) {
        color = "#ff4757";
    }

    ctx.fillStyle = color;

    ctx.fillRect(
        x + 3,
        y + 3,
        (width - 6) * power,
        height - 6
    );
}

// =====================================================
// FÍSICA
// =====================================================

function updatePhysics() {

    let anyMoving = false;

    // -------------------------------------------------
    // MOVIMENTO
    // -------------------------------------------------

    for (const ball of balls) {

        if (ball.pocketed) continue;

        ball.x += ball.vx;
        ball.y += ball.vy;

        // Atrito
        ball.vx *= FRICTION;
        ball.vy *= FRICTION;

        // Eliminar velocidade muito pequena
        if (
            Math.abs(ball.vx) < STOP_SPEED &&
            Math.abs(ball.vy) < STOP_SPEED
        ) {

            ball.vx = 0;
            ball.vy = 0;

        } else {

            anyMoving = true;
        }

        handleWallCollision(ball);
    }

    // -------------------------------------------------
    // COLISÕES
    // -------------------------------------------------

    /*
        Fazemos várias passagens para evitar que
        bolas fiquem sobrepostas.
    */

    for (let iteration = 0; iteration < 3; iteration++) {

        for (let i = 0; i < balls.length; i++) {

            for (
                let j = i + 1;
                j < balls.length;
                j++
            ) {

                resolveBallCollision(
                    balls[i],
                    balls[j]
                );
            }
        }
    }

    // -------------------------------------------------
    // CAÇAPAS
    // -------------------------------------------------

    for (const ball of balls) {

        if (!ball.pocketed) {
            checkPocket(ball);
        }
    }

    // -------------------------------------------------
    // FIM DA TACADA
    // -------------------------------------------------

    if (
        shotInProgress &&
        !anyMoving &&
        !ballsAreMoving()
    ) {

        shotInProgress = false;

        finishTurn();
    }
}

// =====================================================
// COLISÃO COM PAREDE
// =====================================================

function handleWallCollision(ball) {

    if (ball.pocketed) return;

    const left =
        TABLE.x + BALL_RADIUS;

    const right =
        TABLE.x +
        TABLE.width -
        BALL_RADIUS;

    const top =
        TABLE.y + BALL_RADIUS;

    const bottom =
        TABLE.y +
        TABLE.height -
        BALL_RADIUS;

    // Esquerda
    if (ball.x < left) {

        ball.x = left;

        if (ball.vx < 0) {
            ball.vx *= -WALL_BOUNCE;
        }
    }

    // Direita
    if (ball.x > right) {

        ball.x = right;

        if (ball.vx > 0) {
            ball.vx *= -WALL_BOUNCE;
        }
    }

    // Cima
    if (ball.y < top) {

        ball.y = top;

        if (ball.vy < 0) {
            ball.vy *= -WALL_BOUNCE;
        }
    }

    // Baixo
    if (ball.y > bottom) {

        ball.y = bottom;

        if (ball.vy > 0) {
            ball.vy *= -WALL_BOUNCE;
        }
    }
}

// =====================================================
// COLISÃO ENTRE BOLAS
// =====================================================

function resolveBallCollision(a, b) {

    if (
        a.pocketed ||
        b.pocketed
    ) {
        return;
    }

    const dx = b.x - a.x;
    const dy = b.y - a.y;

    const distanceSquared =
        dx * dx + dy * dy;

    const minDistance =
        BALL_RADIUS * 2;

    if (
        distanceSquared >=
        minDistance * minDistance
    ) {
        return;
    }

    let distance =
        Math.sqrt(distanceSquared);

    // Evita divisão por zero
    if (distance === 0) {

        distance = minDistance;

        b.x += 0.01;
    }

    const nx =
        dx / distance;

    const ny =
        dy / distance;

    // -------------------------------------------------
    // SEPARAR AS BOLAS
    // -------------------------------------------------

    const overlap =
        minDistance - distance;

    const correction =
        overlap / 2 + 0.01;

    a.x -= nx * correction;
    a.y -= ny * correction;

    b.x += nx * correction;
    b.y += ny * correction;

    // -------------------------------------------------
    // VELOCIDADE RELATIVA
    // -------------------------------------------------

    const relativeVelocityX =
        b.vx - a.vx;

    const relativeVelocityY =
        b.vy - a.vy;

    const velocityAlongNormal =
        relativeVelocityX * nx +
        relativeVelocityY * ny;

    /*
        Se estão se afastando, não aplica impulso.
    */

    if (velocityAlongNormal > 0) {
        return;
    }

    // -------------------------------------------------
    // IMPULSO
    // -------------------------------------------------

    const impulse =
        -(1 + BALL_BOUNCE) *
        velocityAlongNormal /
        2;

    const impulseX =
        impulse * nx;

    const impulseY =
        impulse * ny;

    a.vx -= impulseX;
    a.vy -= impulseY;

    b.vx += impulseX;
    b.vy += impulseY;

    // Pequena correção para evitar velocidade absurda
    limitBallSpeed(a);
    limitBallSpeed(b);
}

// =====================================================
// LIMITAR VELOCIDADE
// =====================================================

function limitBallSpeed(ball) {

    const speed =
        Math.sqrt(
            ball.vx * ball.vx +
            ball.vy * ball.vy
        );

    if (speed > MAX_SHOT_SPEED) {

        const scale =
            MAX_SHOT_SPEED / speed;

        ball.vx *= scale;
        ball.vy *= scale;
    }
}

// =====================================================
// VERIFICAR SE ALGUMA BOLA ESTÁ EM MOVIMENTO
// =====================================================

function ballsAreMoving() {

    for (const ball of balls) {

        if (ball.pocketed) continue;

        const speed =
            Math.sqrt(
                ball.vx * ball.vx +
                ball.vy * ball.vy
            );

        if (speed > STOP_SPEED) {
            return true;
        }
    }

    return false;
}

// =====================================================
// CAÇAPAS
// =====================================================

function checkPocket(ball) {

    for (const pocket of pockets) {

        const dx =
            ball.x - pocket.x;

        const dy =
            ball.y - pocket.y;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        if (distance < 25) {

            ball.pocketed = true;

            ball.vx = 0;
            ball.vy = 0;

            pocketedThisTurn++;

            // Bola branca
            if (ball.type === "cue") {

                setTimeout(() => {

                    respawnCue();

                }, 250);

                return;
            }

            // Bola colorida
            scores[currentPlayer]++;

            updateScore();

            checkWinner();

            return;
        }
    }
}

// =====================================================
// RECOLOCAR BOLA BRANCA
// =====================================================

function respawnCue() {

    const cue = balls[0];

    if (!cue) return;

    cue.pocketed = false;

    cue.vx = 0;
    cue.vy = 0;

    // Tenta encontrar posição livre
    const positions = [
        {
            x: TABLE.x + 245,
            y: TABLE.y + TABLE.height / 2
        },
        {
            x: TABLE.x + 200,
            y: TABLE.y + 150
        },
        {
            x: TABLE.x + 200,
            y: TABLE.y + TABLE.height - 150
        }
    ];

    for (const position of positions) {

        let valid = true;

        for (const ball of balls) {

            if (
                ball === cue ||
                ball.pocketed
            ) {
                continue;
            }

            const dx =
                ball.x - position.x;

            const dy =
                ball.y - position.y;

            const distance =
                Math.sqrt(dx * dx + dy * dy);

            if (distance < DIAMETER + 5) {
                valid = false;
                break;
            }
        }

        if (valid) {

            cue.x = position.x;
            cue.y = position.y;

            return;
        }
    }

    cue.x = TABLE.x + 245;
    cue.y = TABLE.y + TABLE.height / 2;
}

// =====================================================
// TACADA
// =====================================================

function shoot() {

    const cue = balls[0];

    if (
        !cue ||
        cue.pocketed ||
        shotInProgress ||
        gameOver
    ) {
        return;
    }

    const dx =
        mouse.x - cue.x;

    const dy =
        mouse.y - cue.y;

    const distance =
        Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) return;

    const nx =
        dx / distance;

    const ny =
        dy / distance;

    const speed =
        4 + power * 14;

    cue.vx =
        nx * speed;

    cue.vy =
        ny * speed;

    shotInProgress = true;

    pocketedThisTurn = 0;

    power = 0;
}

// =====================================================
// FINAL DO TURNO
// =====================================================

function finishTurn() {

    if (gameOver) return;

    /*
        Se nenhuma bola entrou,
        passa a vez.
    */

    if (pocketedThisTurn === 0) {

        currentPlayer =
            currentPlayer === 1
                ? 2
                : 1;
    }

    updatePlayerUI();
}

// =====================================================
// VENCEDOR
// =====================================================

function checkWinner() {

    const remaining =
        balls.filter(
            ball =>
                ball.type !== "cue" &&
                !ball.pocketed
        );

    if (remaining.length === 0) {

        gameOver = true;

        if (scores[1] > scores[2]) {

            showMessage(
                "PLAYER 1 VENCEU!"
            );

        } else if (scores[2] > scores[1]) {

            showMessage(
                "PLAYER 2 VENCEU!"
            );

        } else {

            showMessage("EMPATE!");
        }
    }
}

// =====================================================
// INTERFACE
// =====================================================

function updateScore() {

    document.getElementById("score1")
        .textContent = scores[1];

    document.getElementById("score2")
        .textContent = scores[2];
}

function updatePlayerUI() {

    const p1 =
        document.getElementById("player1");

    const p2 =
        document.getElementById("player2");

    p1.classList.remove("active");
    p2.classList.remove("active");

    if (currentPlayer === 1) {

        p1.classList.add("active");

    } else {

        p2.classList.add("active");
    }

    document.getElementById("turnText")
        .textContent =
        `VEZ DO PLAYER ${currentPlayer}`;
}

function showMessage(text) {

    document.getElementById("message")
        .textContent = text;
}

// =====================================================
// MOUSE
// =====================================================

canvas.addEventListener(
    "mousemove",
    event => {

        const rect =
            canvas.getBoundingClientRect();

        const scaleX =
            canvas.width / rect.width;

        const scaleY =
            canvas.height / rect.height;

        mouse.x =
            (event.clientX - rect.left) *
            scaleX;

        mouse.y =
            (event.clientY - rect.top) *
            scaleY;
    }
);

canvas.addEventListener(
    "mousedown",
    event => {

        if (
            event.button !== 0 ||
            shotInProgress ||
            gameOver
        ) {
            return;
        }

        aiming = true;

        power = 0;

        powerDirection = 1;
    }
);

canvas.addEventListener(
    "mouseup",
    event => {

        if (
            event.button !== 0 ||
            !aiming
        ) {
            return;
        }

        aiming = false;

        shoot();
    }
);

// =====================================================
// TOUCH
// =====================================================

canvas.addEventListener(
    "touchmove",
    event => {

        event.preventDefault();

        const touch =
            event.touches[0];

        const rect =
            canvas.getBoundingClientRect();

        const scaleX =
            canvas.width / rect.width;

        const scaleY =
            canvas.height / rect.height;

        mouse.x =
            (touch.clientX - rect.left) *
            scaleX;

        mouse.y =
            (touch.clientY - rect.top) *
            scaleY;

    },
    { passive: false }
);

canvas.addEventListener(
    "touchstart",
    event => {

        event.preventDefault();

        if (
            shotInProgress ||
            gameOver
        ) {
            return;
        }

        aiming = true;

        power = 0;

        powerDirection = 1;

    },
    { passive: false }
);

canvas.addEventListener(
    "touchend",
    event => {

        event.preventDefault();

        if (!aiming) return;

        aiming = false;

        shoot();

    },
    { passive: false }
);

// =====================================================
// NOVO JOGO
// =====================================================

document
    .getElementById("newGame")
    .addEventListener(
        "click",
        newGame
    );

function newGame() {

    scores = {
        1: 0,
        2: 0
    };

    currentPlayer = 1;

    aiming = false;
    power = 0;

    shotInProgress = false;
    pocketedThisTurn = 0;

    gameOver = false;

    createBalls();

    updateScore();
    updatePlayerUI();

    showMessage(
        "PLAYER 1 COMEÇA!"
    );
}

// =====================================================
// FORÇA
// =====================================================

function updatePower() {

    if (!aiming) return;

    power +=
        0.018 * powerDirection;

    if (power >= 1) {

        power = 1;

        powerDirection = -1;
    }

    if (power <= 0) {

        power = 0;

        powerDirection = 1;
    }
}

// =====================================================
// DESENHO
// =====================================================

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawTable();
    drawPockets();

    for (const ball of balls) {
        drawBall(ball);
    }

    if (aiming) {
        drawAim();
    }
}

// =====================================================
// LOOP PRINCIPAL
// =====================================================

function gameLoop() {

    updatePower();

    updatePhysics();

    draw();

    requestAnimationFrame(gameLoop);
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================

createBalls();

updateScore();

updatePlayerUI();

gameLoop();
