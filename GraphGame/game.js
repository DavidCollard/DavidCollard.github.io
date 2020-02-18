(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const { Model, ClickAction } = require('../model/Model');
const Farm = require('../model/Farm').Farm;
const utils = require('../coordinateUtils');

class GameController {
    constructor(model) {
        this.model = model;
        this.modelUpdateSubscribers = [];
    }

    getModel() {
        return this.model;
    }

    subscribe(obj) {
        this.modelUpdateSubscribers.push(obj);
    }

    updateSubscribers() {
        for (let id in this.modelUpdateSubscribers) {
            let subscriber = this.modelUpdateSubscribers[id];
            subscriber();
        }
    }

    gameTick() {
        this.model.currency += Object.keys(this.model.conns).length;
    }

    evtXYClick(coordX, coordY) {
        const clickAction = this.model.clickAction;
        const coordinate = this.model.getCoordinateKey(coordX, coordY);
        const id = this.model.coordStructureLookup[coordinate];

        if (clickAction === ClickAction.STRUCT) {
            if (this.model.isValidId(id)) {
                this.model.CONNECT = id;
            }
            else {
                // console.log(`new structure at ${coordX} ${coordY}`);
                this.model.createStructure(coordX, coordY, Farm);
            }
        }
        else if (clickAction === ClickAction.QUERY) {
            this.model.setSelectedNode(id);
        }
        else if (clickAction === ClickAction.DELETE) {
            if (this.model.isValidId(id)) {
                this.model.deleteStructure(id);
            }
        }
        this.updateSubscribers();
    }

    evtDragUp(coordX, coordY) {
        let model = this.model;
        let coordinate = model.getCoordinateKey(coordX, coordY);
        let toId = model.coordStructureLookup[coordinate];
        let fromId = model.CONNECT;

        if (model.isValidId(toId) && model.isValidId(fromId) && toId != fromId) {
            let fromStruct = model.nodes[fromId];

            if (model.conns[toId] && model.conns[toId].includes(fromStruct.id)) {
                // console.log('inverse connection already exists');
            }
            else {
                model.createConnection(fromId, toId);
            }
        }
        model.CONNECT = null;
        this.updateSubscribers();
    }

    evtChangeClickAction(action) {
        this.model.clickAction = action;
    }
}


module.exports = { GameController };
},{"../coordinateUtils":2,"../model/Farm":5,"../model/Model":6}],2:[function(require,module,exports){
// calculates a pixel coordinate from logical coordinates
// tilePxLen - tile dim
// mX/Y      - logical model
// offX/Y    - current px offset
function calcCanvasXY(tilePxLen, mX, mY, offX, offY) {
    let pxX = mX * tilePxLen + offX;
    let pxY = mY * tilePxLen + offY;
    return { pxX, pxY };
}

// calculates a logical coordinate from pixel coordinates
// tilePxLen - tile dim
// offsetX/Y - net screen scroll
// pointX/Y  - query point
function calcCoordinate(tilePxLen, offsetX, offsetY, pointX, pointY) {
    let coordX = Math.floor((pointX - offsetX) / tilePxLen);
    let coordY = Math.floor((pointY - offsetY) / tilePxLen);
    return { coordX, coordY };
}

// euclidian distance
function distance(x1, y1, x2, y2) {
    let a = (x1 - x2);
    let b = (y1 - y2);
    return Math.sqrt(a * a + b * b);
}

// denormalized euclidian distance
// appropriate for comparisions
function distance_raw(x1, y1, x2, y2) {
    let a = (x1 - x2);
    let b = (y1 - y2);
    return a * a + b * b;
}

module.exports = { calcCanvasXY, calcCoordinate, distance, distance_raw };

},{}],3:[function(require,module,exports){
const Model = require('./model/Model').Model;
const GameController = require('./controller/GameController').GameController;
const GameCanvasView = require('./view/GameCanvas').GameCanvasView;
const UICanvasView = require('./view/UICanvas').UICanvasView;

function startup() {
    let model = new Model();
    let gameController = new GameController(model);
    let gameCanvasView = new GameCanvasView("game_canvas", gameController);
    let uiCanvasView = new UICanvasView("ui_canvas", gameController);

    const gameDelay = 1000;
    var tmpGameDelay = gameDelay;
    var lastGameUpdate = Date.now();

    const gameLoop = () => {
        setTimeout(() => {
            let now = Date.now();
            let actual = now - lastGameUpdate;
            tmpGameDelay = gameDelay - (actual - tmpGameDelay);
            lastGameUpdate = now;
            gameController.gameTick();
            gameController.updateSubscribers();
            gameLoop();
        }, tmpGameDelay);
    };
    gameLoop();

    const drawDelay = 50;
    var tmpDrawDelay = drawDelay;
    var lastDrawUpdate = Date.now();

    const drawLoop = () => {
        setTimeout(() => {
            let now = Date.now();
            let actual = now - lastDrawUpdate;
            tmpDrawDelay = drawDelay - (actual - tmpDrawDelay);
            lastDrawUpdate = now;
            gameCanvasView.drawBoard(true);
            drawLoop();
        }, tmpDrawDelay);
    };
    drawLoop();

    window.onmousedown = (e) => {
        if (!uiCanvasView.isClicked(e)) {
            return;
        }
        let res = uiCanvasView.onmousedown(e);
        if (res) {
            gameCanvasView.onmousedown(e);
        }
    }

    window.onmousemove = (e) => {
        if (!uiCanvasView.isClicked(e)) {
            return;
        }
        let res = uiCanvasView.onmousemove(e);
        if (res) {
            gameCanvasView.onmousemove(e);
        }
    }

    window.onmouseup = (e) => {
        if (!uiCanvasView.isClicked(e)) {
            return;
        }
        let res = uiCanvasView.onmouseup(e);
        if (res) {
            gameCanvasView.onmouseup(e);
        }
    }

    window.onmouseout = (e) => {
        if (!uiCanvasView.isClicked(e)) {
            return;
        }
        let res = uiCanvasView.onmouseout(e);
        if (res) {
            gameCanvasView.onmouseout(e);
        }
    }

    //TODO: non-chrome support
    window.onwheel = (e) => {
        let res = uiCanvasView.onwheel(e);
        console.log('out')
        if (res) {
            gameCanvasView.onwheel(e);
        }
    }

    window.onkeydown = (e) => {
        let res = uiCanvasView.onkeydown(e);
        if (res) {
            gameCanvasView.onkeydown(e);
        }
    }

    window.onresize = (e) => {
        uiCanvasView.onresize(e);
        gameCanvasView.onresize(e);
    }
}

window.onload = startup;
},{"./controller/GameController":1,"./model/Model":6,"./view/GameCanvas":10,"./view/UICanvas":11}],4:[function(require,module,exports){
const Structure = require('./Structure').Structure;

class CommandNode extends Structure {
    constructor(id, xCoord, yCoord) {
        const range = 10;
        const maxInConns = 10;
        const maxOutConns = 5;
        super(id, xCoord, yCoord, range, maxInConns, maxOutConns);
    }
};

module.exports = { CommandNode };
},{"./Structure":7}],5:[function(require,module,exports){
const Structure = require('./Structure').Structure;

class Farm extends Structure {
    constructor(id, xCoord, yCoord) {
        const range = 5;
        const maxInConns = 3;
        const maxOutConns = 2;
        super(id, xCoord, yCoord, range, maxInConns, maxOutConns);
    }
};

module.exports = { Farm };
},{"./Structure":7}],6:[function(require,module,exports){
// const Structure = require('./Structure').Structure;
const { StructureStatus, Structure } = require('./Structure');
const CommandNode = require('./CommandNode').CommandNode;
const Farm = require('./Farm').Farm;

const ClickAction = {
    QUERY: 0,
    STRUCT: 1,
    DELETE: 2
}

// game model
class Model {
    constructor() {
        this.reset();
    }

    reset() {
        this.coordStructureLookup = {}; // getCoordinateKey => structure.id
        this.nodes = [];                // structure.id => structure
        this.deadNodes = [];            // list of unused nodes which can be repurposed
        this.conns = {};
        this.CONNECT = null;
        this.clickAction = ClickAction.QUERY;
        this.selectedNode = null;
        this.selectedChildren = [];
        this.selectedAncestors = [];
        this.currency = 0;

        this.createStructure(0, 0, CommandNode);
    };

    getCoordinateKey(x, y) {
        // replace with hash in future?
        return JSON.stringify([x, y]);
    };

    getStructKey(struct) {
        return JSON.stringify([struct.xCoord, struct.yCoord])
    };

    isStructureAt(x, y) {
        const coordinate = this.getCoordinateKey(x, y);
        return this.isValidId(this.coordStructureLookup[coordinate]);
    };

    getStructureAt(x, y) {
        const id = this.coordStructureLookup[this.getCoordinateKey(x, y)];
        return this.getStructure(id);
    };

    createStructure(x, y, StructType) {
        if (this.isStructureAt(x, y)) {
            // console.log(`cannot create structure at ${this.getCoordinateKey(x, y)} because another structure is already there`);
        }
        if (this.deadNodes.length === 0) {
            // allocate new space
            let id = this.nodes.length;
            this.nodes.push(new StructType(id, x, y));

            let key = this.getCoordinateKey(x, y);
            this.coordStructureLookup[key] = id;
        }
        else {
            // reuse id, clean up old object
            let id = this.deadNodes.pop();
            this.nodes[id] = new StructType(id, x, y);

            let key = this.getCoordinateKey(x, y);
            this.coordStructureLookup[key] = id;
        }
    };

    deleteStructure(id) {
        const struct = this.getStructure(id);
        struct.deactivate();

        for (let inId of struct.inConns) {
            const inStruct = this.getStructure(inId);
            inStruct.removeOutConn(id);
        }
        for (let outId of struct.outConns) {
            const outStruct = this.getStructure(outId);
            outStruct.removeInConn(id);
        }

        delete this.coordStructureLookup[this.getStructKey(struct)];
        
        if (this.selectedNode === id) {
            this.setSelectedNode(null);
        }
        else { 
            this.refreshSelectedNode();
        }

        this.deadNodes.push(id);

        this.rebuildConns();
    }

    createConnection(fromId, toId) {
        const fromStruct = this.getStructure(fromId);
        const toStruct = this.getStructure(toId);
        const isValid = fromStruct.withinRange(toStruct);

        if (!isValid) {
            // console.log(`cannot create connection between ${this.getStructKey(fromStruct)} and ${this.getStructKey(toStruct)} - exceeds range of ${fromStruct.range}`);
            return;
        }

        if (fromStruct.maxOutConns <= fromStruct.outConns.length) {
            // console.log(`Cannot create connection as node ${this.getStructKey(fromStruct)} has reached it's maximum number of outbound connections`);
            return;
        }

        if (toStruct.maxInConns <= toStruct.inConns.length) {
            // console.log(`Cannot create connection as node ${this.getStructKey(fromStruct)} has reached it's maximum number of inbound connections`);
            return;
        }

        // console.log(`created connection between ${this.getStructKey(fromStruct)} and ${this.getStructKey(toStruct)}`);

        // model list
        fromStruct.outConns.push(toStruct.id);
        toStruct.inConns.push(fromStruct.id);

        // duplicate information for easier rendering (can be re-generated from stratch via RebuildConns())
        if (this.conns[fromStruct.id]) {
            this.conns[fromStruct.id].push(toStruct.id);
        }
        else {
            this.conns[fromStruct.id] = [toStruct.id];
        }

        this.refreshSelectedNode();
    };

    rebuildConns() {
        let conns = [];
        for (const struct of this.nodes) {
            if (struct.status !== StructureStatus.ACTIVE || !struct.outConns) {
                continue;
            }
            conns[struct.id] = struct.outConns.slice(); // copy
        }
        this.conns = conns;
    }

    getStructure(id) {
        return this.nodes[id];
    };

    isValidId(id) {
        return id !== null && id !== undefined && id >= 0 && id < this.nodes.length && this.nodes[id].status === StructureStatus.ACTIVE;
    };

    calcBgColour(x, y) {
        if (this.isValidId(this.CONNECT)) {
            let struct = this.getStructure(this.CONNECT);
            if (struct.pointInRange(x, y)) {
                return '#ffa500'; // orange
            }
        }

        const r1 = 255, g1 = 255, b1 = 240;//'#FFFFF0' -- whiteish
        const r2 = 144, g2 = 238, b2 = 144;//'#90EE90' -- green

        let factor = 0;
        for (let id in this.nodes) {
            const struct = this.nodes[id];
            if (struct.status === StructureStatus.ACTIVE && struct.pointInRange(x, y)) {
                const dist = struct.distanceToPoint(x, y);
                factor = Math.min(1, factor + (struct.range - dist) / struct.range);
            }
        }

        let r = Math.round(factor * r2 + (1 - factor) * r1);
        let g = Math.round(factor * g2 + (1 - factor) * g1);
        let b = Math.round(factor * b2 + (1 - factor) * b1);
        // console.log(`${x}, ${y}, ${factor} -> '#${r.toString(16)}${g.toString(16)}${b.toString(16)}'`);

        return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
    };

    drawTile(x, y, pxX, pxY, dim, ctx) {
        const bgColour = this.calcBgColour(x, y);
        if (this.isStructureAt(x, y)) {
            const struct = this.getStructureAt(x, y);
            struct.draw(pxX, pxY, dim, ctx, bgColour);
            if (struct.id == this.selectedNode) {
                ctx.beginPath();
                ctx.strokeStyle = "red";
                ctx.linewidth = 10;
                ctx.rect(pxX, pxY, dim, dim);
                ctx.stroke();
            }
        }
        else {
            ctx.fillStyle = bgColour;
            ctx.fillRect(pxX + 1, pxY + 1, dim - 1, dim - 1);
        }
    };

    refreshSelectedNode() {
        const id = this.selectedNode;
        if (this.isValidId(id)) {
            this.selectedChildren = this.getAllChildren(id, true);
            this.selectedAncestors = this.getAllAncestors(id, true);
        }
        else {
            this.selectedChildren = [];
            this.selectedAncestors = [];
        }
    }

    setSelectedNode(id) {
        if (this.isValidId(id)) {
            this.selectedNode = id;
        } else {
            this.selectedNode = null;
        }
        this.refreshSelectedNode();
    }

    getAllChildren(id, includesSelf = false) {
        const getChildren = (struct) => struct.outConns;
        const children = this.bfs(id, getChildren);
        if (includesSelf) {
            children.push(id);
        }
        return children;
    };

    getAllAncestors(id, includesSelf = true) {
        const getAncestors = (struct) => struct.inConns;
        const ancestors = this.bfs(id, getAncestors);
        if (includesSelf) {
            ancestors.push(id);
        }
        return ancestors;
    };

    // performs a bfs, returns a list of ids of relatives.
    // uses prop(struct) to get relatives
    bfs(id, prop) {
        const root = this.getStructure(id);
        let currId = 0;
        let relatives = prop(root).slice(0); // clone
        while (relatives.length > currId) {
            const nextStruct = this.getStructure(relatives[currId]);
            for (let ele of prop(nextStruct)) {
                if (!relatives.includes(ele)) {
                    relatives.push(ele);
                }
            }
            currId += 1;
        }
        return relatives;
    };

};

module.exports = { Model, ClickAction };
},{"./CommandNode":4,"./Farm":5,"./Structure":7}],7:[function(require,module,exports){
const utils = require('../coordinateUtils');

const StructureStatus = {
    ACTIVE: 0,
    INACTIVE: 1
};

class Structure {
    constructor(id, xCoord, yCoord, range, maxInConns, maxOutConns) {
        this.id = id;
        this.status = StructureStatus.ACTIVE;
        this.xCoord = xCoord;
        this.yCoord = yCoord;
        this.inConns = [];    //list of id's
        this.outConns = [];   //list of id's
        this.range = range;   //maximum euclidian distance for a connection
        this.maxInConns = maxInConns;
        this.maxOutConns = maxOutConns;
    };

    // pxX/pxY indicate the top left corner of the cell to be drawn
    // dim is the dimension of the square sprite to be drawn
    // ctx is the canvas context for the draw
    draw(pxX, pxY, dim, ctx, bgColour) {
        ctx.beginPath();

        // ctx.fillStyle = '#90EE90';
        ctx.fillStyle = bgColour;
        ctx.fillRect(pxX + 1, pxY + 1, dim - 1, dim - 1);

        ctx.arc(
            pxX + 0.5 * dim,
            pxY + 0.5 * dim,
            dim * 0.25,
            0,
            2 * Math.PI
        );

        ctx.strokeStyle = "#000";
        ctx.stroke();

        ctx.closePath();
    };

    deactivate() {
        this.status = StructureStatus.INACTIVE;
    };

    removeInConn(id) {
        this.inConns.splice(this.inConns.indexOf(id), 1);
    };

    removeOutConn(id) {
        this.outConns.splice(this.outConns.indexOf(id), 1);
    };

    withinRange(anotherStruct) {
        return this.range * this.range >= utils.distance_raw(this.xCoord, this.yCoord, anotherStruct.xCoord, anotherStruct.yCoord);
    };

    distanceTo(anotherStruct) {
        return utils.distance(this.xCoord, this.yCoord, anotherStruct.xCoord, anotherStruct.yCoord);
    };

    pointInRange(x, y) {
        // console.log(`${x}, ${y}, ${this.xCoord}, ${this.yCoord} -> ${utils.distance_raw(this.xCoord, this.yCoord, x, y)}`)
        return this.range * this.range >= utils.distance_raw(this.xCoord, this.yCoord, x, y);
    };

    distanceToPoint(x, y) {
        return utils.distance(this.xCoord, this.yCoord, x, y);
    };

    getQueryDesc() {
        return [`${this.xCoord}, ${this.yCoord}`, `range: ${this.range}`];
    };
}

module.exports = { Structure, StructureStatus };
},{"../coordinateUtils":2}],8:[function(require,module,exports){
const UIElement = require('./UIElement').UIElement;
const CanvasButton = require('./CanvasButton').CanvasButton;

const ExtendDir = {
    HORIZONTAL: 0,
    VERTICAL: 1
};

class ButtonGroup extends UIElement {
    constructor(x, y, extendDir) {
        super();
        this.x = x;
        this.y = y;
        this.visible = true;
        this.extendDir = extendDir;
        this.width = 0;
        this.height = 0;
        this.buttons = [];
    };

    addButton(width, height, clickEvent, labelF, visible) {
        const x = this.x + (this.extendDir === ExtendDir.HORIZONTAL ? this.width : 0);
        const y = this.y + (this.extendDir !== ExtendDir.HORIZONTAL ? this.height : 0);
        
        if (this.extendDir === ExtendDir.HORIZONTAL) {
            this.width += width;
            this.height = Math.max(this.height, height);
        } else {
            this.height += height;
            this.width = Math.max(this.width, width);
        }
        
        this.buttons.push(
            new CanvasButton(x, y, width, height, clickEvent, labelF, visible)
        );
    };

    draw(ctx) {
        for (let button of this.buttons) {
            button.draw(ctx);
        }
    };

    isClicked(x, y) {
        return this.visible && x > this.x && y > this.y && x < this.x + this.width && y < this.y + this.height;
    };

    click(e, x, y) {
        for (let button of this.buttons) {
            if (button.isClicked(x, y)) {
                button.click(e, x, y);
                break;
            }
        }
    }
};

module.exports = { ButtonGroup, ExtendDir };
},{"./CanvasButton":9,"./UIElement":12}],9:[function(require,module,exports){
const UIElement = require('./UIElement').UIElement;

class CanvasButton extends UIElement {
    constructor(x, y, width, height, clickEvent, labelF, visible) {
        super();
        this.x = x; // x,y of top left
        this.y = y;
        this.width = width;
        this.height = height;
        this.labelF = labelF;
        this.clickEvent = clickEvent;
        this.visible = visible;
    }

    isClicked(x, y) {
        return this.visible && x > this.x && y > this.y && x < this.x + this.width && y < this.y + this.height;
    }

    click(e, x, y) {
        this.clickEvent(e);
    }

    draw(ctx) {

        let { text: labels, colour } = this.labelF();
        if (!this.visible) {
            ctx.clearRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2);
            ctx.stroke();
            return;
        }
        ctx.strokeStyle = '#000000';
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = colour;//'#90EE90';
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
        ctx.beginPath();
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.font = '11px FontAwesome';
        let vert = 0;
        for (let line of labels) {
            ctx.fillText(
                line,
                this.x + this.width / 2,
                this.y + this.height / 4 + vert
            );
            vert += this.height / 4;
        }
        ctx.stroke();
    }
};

module.exports = { CanvasButton };
},{"./UIElement":12}],10:[function(require,module,exports){
const utils = require('../coordinateUtils');

class GameCanvasView {
    constructor(containerName, controller) {
        this.controller = controller;

        // meta
        this.gameCanvas = document.getElementById(containerName);
        this.gcctx = this.gameCanvas.getContext("2d");

        // canvas dims/pos
        this.offsetX;
        this.offsetY;
        this.canvasWidth;
        this.canvasHeight;
        this.tilePxLen = 40;

        // dragging/positioning variables
        this.isDragging = false;
        this.globalX = 0;
        this.globalY = 0;
        this.localX = 0;
        this.localY = 0;
        this.clickStartX;
        this.clickStartY;
        this.currMouseX;
        this.currMouseY;
        this.drawCoordinates = false;
        this.lastFrame = new Date() - 1000;

        this.init(containerName);
    }

    calculateCanvasDims() {
        const rect = this.gameCanvas.parentNode.getBoundingClientRect();
        this.gameCanvas.width = rect.width;
        this.gameCanvas.height = rect.height;
        this.offsetX = this.gameCanvas.offsetLeft;
        this.offsetY = this.gameCanvas.offsetTop;
        this.canvasWidth = this.gameCanvas.width;
        this.canvasHeight = this.gameCanvas.height;
        this.isDragging = false;
        this.drawBoard(true);
    }

    moveCamera(xCoord, yCoord, tilePxLen = this.tilePxLen, height = this.canvasHeight, width = this.canvasWidth) {
        const hmidOffset = width / 2;
        const vmidOffset = height / 2;
        const xPx = xCoord * tilePxLen + hmidOffset;
        const yPx = yCoord * tilePxLen + vmidOffset;
        this.globalX = xPx;
        this.globalY = yPx;
        this.drawBoard(true);
    }

    drawAnimatedElements(forceUpdate = false) {
        let now = new Date();

        if (!forceUpdate && now - this.lastFrame < 16) {
            return;
        }
        const globalX = this.globalX;
        const globalY = this.globalY;
        const localX = this.localX;
        const localY = this.localY;
        const tilePxLen = this.tilePxLen;
        const canvasHeight = this.canvasHeight;
        const canvasWidth = this.canvasWidth;
        let ctx = this.gcctx;

        const minX = Math.floor((-globalX - localX) / tilePxLen);
        const minY = Math.floor((-globalY - localY) / tilePxLen);
        const maxX = minX + (canvasWidth / tilePxLen) + 1;
        const maxY = minY + (canvasHeight / tilePxLen) + 1;

        const model = this.controller.getModel();
        
        let queryChildren = model.selectedChildren;
        let queryAncestors = model.selectedAncestors;
    
        for (let src in model.conns) {
            for (let sink in model.conns[src]) {

                const srcStruct = model.nodes[src];
                const sinkStruct = model.nodes[model.conns[src][sink]];

                const [srcCX, srcCY] = [srcStruct.xCoord, srcStruct.yCoord];
                const [sinkCX, sinkCY] = [sinkStruct.xCoord, sinkStruct.yCoord];

                // culling logic for lines
                let dontCull = false
                // check if in viewbox
                dontCull |= (srcCX >= minX && srcCX <= maxX && srcCY >= minY && srcCY <= maxY);
                dontCull |= (sinkCX >= minX && sinkCX <= maxX && sinkCY >= minY && sinkCY <= maxY);

                if (!dontCull) {
                    // check if both points in same horizontal or vertical region outside of viewbox
                    if ((srcCX > maxX && sinkCX > maxX) ||
                        (srcCX < minX && sinkCX < minX) ||
                        (srcCY > maxY && sinkCY > maxY) ||
                        (srcCY < minY && sinkCY < minY)
                    ) {
                        continue;
                    }

                    // check if points outside of viewbox have a line intersecting the viewbox
                    const slope = (srcCY - sinkCY) / (srcCX - sinkCX);
                    const intLeft = minX * slope;
                    dontCull |= (intLeft >= minY && intLeft <= maxY);
                    const intRight = maxX * slope;
                    dontCull |= (intRight >= minY && intRight <= maxY);
                    const intTop = minY / slope;
                    dontCull |= (intTop >= minX && intTop <= maxX);
                    const intBot = maxY / slope;
                    dontCull |= (intBot >= minX && intBot <= maxX);

                    if (!dontCull) {
                        continue;
                    }
                }

                let { pxX: srcX, pxY: srcY } = utils.calcCanvasXY(tilePxLen, srcCX, srcCY, globalX + localX, globalY + localY);
                let { pxX: sinkX, pxY: sinkY } = utils.calcCanvasXY(tilePxLen, sinkCX, sinkCY, globalX + localX, globalY + localY);

                //center
                srcX += 0.5 * tilePxLen;
                srcY += 0.5 * tilePxLen;
                sinkX += 0.5 * tilePxLen;
                sinkY += 0.5 * tilePxLen;

                let isAncestor = queryAncestors.includes(sinkStruct.id); // then both src and sink are ancestors 
                let isChild = queryChildren.includes(srcStruct.id);      // then both src and sink are children
                
                if (isAncestor && isChild) {
                    ctx.strokeStyle = "green";
                }
                else if (isAncestor) {
                    ctx.strokeStyle = "blue";
                }
                else if (isChild) {
                    ctx.strokeStyle = "yellow";
                }
                else // default
                {
                    ctx.strokeStyle = "grey";
                }

                // line
                ctx.beginPath();
                ctx.lineWidth = 3;
                ctx.moveTo(srcX, srcY);
                ctx.lineTo(sinkX, sinkY);
                ctx.stroke();
                ctx.closePath();

                const len = utils.distance(srcX / tilePxLen, srcY / tilePxLen, sinkX / tilePxLen, sinkY / tilePxLen);
                const percent = (now % (len * 1000)) / (len * 1000);

                // packet
                ctx.beginPath();
                ctx.strokeStyle = "red";
                ctx.lineWidth = 3;
                if (percent < 0.9) {
                    ctx.moveTo(
                        srcX + (sinkX - srcX) * percent,
                        srcY + (sinkY - srcY) * percent
                    );
                    ctx.lineTo(
                        srcX + (sinkX - srcX) * (percent + 0.1),
                        srcY + (sinkY - srcY) * (percent + 0.1)
                    );
                }

                ctx.stroke();
                ctx.closePath();
            }
        }
    }

    drawBoard(forceUpdate = false) {
        const model = this.controller.getModel();

        let now = new Date();

        if (!forceUpdate && now - this.lastFrame < 16) {
            return;
        }

        const globalX = this.globalX;
        const globalY = this.globalY;
        const localX = this.localX;
        const localY = this.localY;
        const tilePxLen = this.tilePxLen;
        const canvasHeight = this.canvasHeight;
        const canvasWidth = this.canvasWidth;
        let ctx = this.gcctx;

        ctx.beginPath();
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const draggedOffsetX = (globalX + localX) % tilePxLen;
        const draggedOffsetY = (globalY + localY) % tilePxLen;

        const coordX = Math.floor((-globalX - localX) / tilePxLen);
        const coordY = Math.floor((-globalY - localY) / tilePxLen);
        // console.log(`draw: cx: ${coordX}, cy: ${coordY}`);

        // gridlines
        ctx.lineWidth = 1;
        for (let x = 0.5; x <= canvasWidth + tilePxLen; x += tilePxLen) {
            ctx.moveTo(x + draggedOffsetX, 0);
            ctx.lineTo(x + draggedOffsetX, canvasHeight);
        }

        for (let y = 0.5; y <= canvasHeight + tilePxLen; y += tilePxLen) {
            ctx.moveTo(0, y + draggedOffsetY);
            ctx.lineTo(canvasWidth, y + draggedOffsetY);
        }
        ctx.strokeStyle = "#000";
        ctx.stroke();
        ctx.closePath();

        // grid contents
        for (var x = 0; x <= (canvasWidth / tilePxLen) + 1; x++) {
            for (var y = 0; y <= (canvasHeight / tilePxLen) + 1; y++) {
                // coordinate text
                if (this.drawCoordinates && (x + coordX) % 5 == 0 && (y + coordY) % 5 == 0) {
                    // negative offset rolls in opposite direction
                    const negOffsetX = coordX < 0 && draggedOffsetX % tilePxLen != 0 ? 1 : 0;
                    const negOffsetY = coordY < 0 && draggedOffsetY % tilePxLen != 0 ? 1 : 0;

                    ctx.fillText(
                        `${x + coordX}, ${y + coordY}`,
                        draggedOffsetX + (x - negOffsetX) * tilePxLen + 0.2 * tilePxLen,
                        draggedOffsetY + (y - negOffsetY) * tilePxLen + 0.6 * tilePxLen
                    );
                }
                const { pxX, pxY } = utils.calcCanvasXY(tilePxLen, x + coordX, y + coordY, globalX + localX, globalY + localY);
                model.drawTile(x + coordX, y + coordY, pxX, pxY, tilePxLen, ctx);
            }
        }

        if (model.isValidId(model.CONNECT)) {
            const struct = model.nodes[model.CONNECT];
            const [arcX, arcY] = [struct.xCoord, struct.yCoord];

            let { pxX, pxY } = utils.calcCanvasXY(tilePxLen, arcX, arcY, globalX + localX, globalY + localY);

            // center it
            pxX += 0.5 * tilePxLen;
            pxY += 0.5 * tilePxLen;

            ctx.beginPath();
            ctx.moveTo(this.currMouseX, this.currMouseY);
            ctx.lineTo(pxX, pxY);
            ctx.stroke();
            ctx.closePath();
        }
        this.drawAnimatedElements(forceUpdate);
        this.lastFrame = new Date();
    }

    calcCoordinate(xPx, yPx) {
        return utils.calcCoordinate(this.tilePxLen, this.globalX + this.localX, this.globalY + this.localY, xPx, yPx);
    }

    handleMouseDown(e) {
        const canMouseX = parseInt(e.clientX - this.offsetX);
        const canMouseY = parseInt(e.clientY - this.offsetY);

        if (e.button === 0) // left mouse
        {
            const { coordX, coordY } = this.calcCoordinate(canMouseX, canMouseY);
            this.currMouseX = canMouseX;
            this.currMouseY = canMouseY;

            this.controller.evtXYClick(coordX, coordY);

            this.drawBoard();
        }

        if (e.button === 1 || e.button === 2) // middle mouse
        {
            // view-only event
            this.clickStartX = canMouseX;
            this.clickStartY = canMouseY;
            this.isDragging = true;
        }
    }

    handleMouseUp(e) {
        const canMouseX = parseInt(e.clientX - this.offsetX);
        const canMouseY = parseInt(e.clientY - this.offsetY);

        if (e.button === 0) {
            const coordX = Math.floor((canMouseX - (this.globalX + this.localX)) / this.tilePxLen);
            const coordY = Math.floor((canMouseY - (this.globalY + this.localY)) / this.tilePxLen);

            this.controller.evtDragUp(coordX, coordY);

            this.drawBoard(true);
        }

        if (e.button === 1 || e.button === 2) {
            this.globalX += this.localX;
            this.globalY += this.localY;
            this.localX = 0;
            this.localY = 0;
        }

        // clear the drag flag
        this.drawBoard(true);
        this.isDragging = false;
    }

    handleMouseOut(e) {
        const canMouseX = parseInt(e.clientX - this.offsetX);
        const canMouseY = parseInt(e.clientY - this.offsetY);

        this.globalX += this.localX;
        this.globalY += this.localY;
        this.localX = 0;
        this.localY = 0;

        // user has left the canvas, so clear the drag flag
        this.drawBoard(true);
        this.isDragging = false;
    }

    handleMouseMove(e) {
        const canMouseX = parseInt(e.clientX - this.offsetX);
        const canMouseY = parseInt(e.clientY - this.offsetY);

        // if the drag flag is set, clear the canvas and draw the image
        if (this.isDragging) {
            this.localX = (canMouseX - this.clickStartX);
            this.localY = (canMouseY - this.clickStartY);
            this.drawBoard();
        }

        const model = this.controller.getModel();
        if (model.isValidId(model.CONNECT)) {
            this.currMouseX = canMouseX;
            this.currMouseY = canMouseY;
            this.drawBoard(true);
        }
    }

    onwheel(e) {
        if (e.deltaY > 0) {
            this.tilePxLen = Math.max(this.tilePxLen - 5, 20);
        } else if (e.deltaY < 0) {
            this.tilePxLen = Math.min(this.tilePxLen + 5, 80);
        }
    }

    handleKeyDown(e) {
        if (e.key === ' ') {
            this.tilePxLen = 40;
            this.moveCamera(0, 0);
            this.drawBoard();
        }
    }

    handleReset(e) {
        const model = this.controller.getModel();
        model.reset();
        this.calculateCanvasDims();
        this.moveCamera(0, 0);
    }

    handleResize(e) {
        this.gameCanvas.width = 0;
        this.gameCanvas.height = 0;
        this.calculateCanvasDims();
    }

    init() {

        this.calculateCanvasDims();
        this.moveCamera(0, 0); //calls drawBoard, which is bad because calculatecanvasdims does this already...

        let canvas = this.gameCanvas;

        this.onmousedown = (e) => { return this.handleMouseDown(e); };
        this.onmousemove = (e) => { this.handleMouseMove(e) };
        this.onmouseup = (e) => { this.handleMouseUp(e) };
        this.onmouseout = (e) => { this.handleMouseOut(e) };
        this.onkeydown = (e) => { this.handleKeyDown(e) };
        canvas.oncontextmenu = () => { return false; }; // disable right click menu

        let reset = document.getElementById('reset');
        reset.onclick = (e) => { this.handleReset(e) };

        this.onresize = (e) => { this.handleResize(e) };
    }
}

module.exports = { GameCanvasView };
},{"../coordinateUtils":2}],11:[function(require,module,exports){
const ClickAction = require('../model/Model').ClickAction;
const CanvasButton = require('./CanvasButton').CanvasButton;
const { ButtonGroup, ExtendDir } = require('./ButtonGroup');

class UICanvasView {
    constructor(containerName, controller) {
        this.controller = controller;

        this.uiCanvas = document.getElementById(containerName);
        this.uictx = this.uiCanvas.getContext("2d");
        this.uiElements = [];
        this.init();
    }

    draw(forceUpdate = false) {
        // console.log('drawing UI');
        this.controller.getModel();
        let ctx = this.uictx;
        let width = this.uiCanvas.width;
        let height = this.uiCanvas.height;

        for (let id in this.uiElements) {
            let element = this.uiElements[id];
            element.draw(ctx);
        }

    }

    calculateCanvasDims() {
        const rect = this.uiCanvas.parentNode.getBoundingClientRect();
        this.uiCanvas.width = rect.width;
        this.uiCanvas.height = rect.height;

        // this.uiCanvas.style.bottom = '0px';

        this.offsetX = this.uiCanvas.offsetLeft;
        this.offsetY = this.uiCanvas.offsetTop;
        this.canvasWidth = this.uiCanvas.width;
        this.canvasHeight = this.uiCanvas.height;
    }

    handleResize(e) {
        this.calculateCanvasDims();
        this.initButtons();
        this.draw();
    }

    isClicked(e) {
        const mouseX = parseInt(e.clientX - this.offsetX);
        const mouseY = parseInt(e.clientY - this.offsetY);
        return mouseX >= 0 && mouseX <= this.canvasWidth && mouseY >= 0 && mouseY <= this.canvasHeight;
    }

    handleMouseDown(e) {
        const mouseX = parseInt(e.clientX - this.offsetX);
        const mouseY = parseInt(e.clientY - this.offsetY);
        let clicked = false;

        for (let button of this.uiElements) {
            if (button.isClicked(mouseX, mouseY)) {
                button.click(e, mouseX, mouseY);
                clicked = true;
                break;
            }
        }

        return !clicked;
    }

    onwheel(e) {
        return true;
    }

    handleKeyDown(e) {
        if (e.key === 'q') {
            this.controller.evtChangeClickAction(ClickAction.QUERY);
        }
        else if (e.key === 'w') {
            this.controller.evtChangeClickAction(ClickAction.STRUCT);
        }
        else if (e.key === 'e') {
            this.controller.evtChangeClickAction(ClickAction.DELETE);
        }
        this.draw();
        return true;
    }

    initButtons() {

        this.uiElements = [];

        let canvas = this.uiCanvas;
        let controller = this.controller;
        
        const buttonH = 50;
        const buttonW = 50;
        const defaultActive = '#90EE90';
        const defaultSelected = '#42b3f5';

        /*
        const menuGroup = new ButtonGroup(
            (canvas.width - buttonW) / 2,
            canvas.height - buttonH * 1.5,
            ExtendDir.HORIZONTAL
        );
        */
        
        const menuGroup = new ButtonGroup(
            canvas.width - buttonW * 1.5,
            (canvas.height - buttonH) / 2,
            ExtendDir.VERTICAL
        );

        this.uiElements.push(menuGroup);
        // node #
        menuGroup.addButton(
            buttonH,
            buttonW,
            (e) => { },
            () => {
                return {
                    text: ["# of nodes", controller.getModel().nodes.length - controller.getModel().deadNodes.length],
                    colour: defaultActive
                }
            },
            true
        );
        // query
        menuGroup.addButton(
            buttonW,
            buttonH,
            (e) => { controller.evtChangeClickAction(ClickAction.QUERY); },
            () => {
                return {
                    text: ["\uf002", "Query"],
                    colour: controller.getModel().clickAction === ClickAction.QUERY ? defaultSelected : defaultActive
                }
            },
            true
        );
        // struct
        menuGroup.addButton(
            buttonW,
            buttonH,
            (e) => { controller.evtChangeClickAction(ClickAction.STRUCT); },
            () => {
                return {
                    text: ["\uf055", "Struct"],
                    colour: controller.getModel().clickAction === ClickAction.STRUCT ? defaultSelected : defaultActive
                }
            },
            true
        );
        //delete
        menuGroup.addButton(
            buttonW,
            buttonH,
            (e) => { controller.evtChangeClickAction(ClickAction.DELETE); },
            () => {
                return {
                    text: ["\uf014", "Delete"],
                    colour: controller.getModel().clickAction === ClickAction.DELETE ? defaultSelected : defaultActive
                }
            },
            true
        );
        // currency
        menuGroup.addButton(
            buttonW,
            buttonH,
            (e) => { },
            () => {
                return {
                    text: ["Currency", controller.getModel().currency],
                    colour: defaultActive
                }
            },
            true
        );

        // query panel
        this.uiElements.push(
            new CanvasButton(
                10,
                10,
                buttonW * 2,
                buttonH * 2,
                (e) => { },
                function () {
                    const model = controller.getModel();
                    const id = model.selectedNode;
                    if (model.isValidId(id)) {
                        this.visible = true;
                        const struct = model.getStructure(id);
                        return { text: struct.getQueryDesc(), colour: defaultActive };
                    }
                    this.visible = false;
                    return { text: [], colour: defaultActive };
                },
                false
            )
        );
    };

    init() {
        this.calculateCanvasDims();
        
        let canvas = this.uiCanvas;
        let controller = this.controller;
        
        let uiCanvas = this;
        controller.subscribe(() => { uiCanvas.draw() });

        this.initButtons();

        this.draw();

        this.onmousedown = (e) => { return this.handleMouseDown(e) };
        this.onmousemove = (e) => { return true;/*this.handleMouseMove(e)*/ };
        this.onmouseup = (e) => { return true;/*this.handleMouseUp(e)*/ };
        this.onmouseout = (e) => { return true;/*this.handleMouseOut(e)*/ };
        this.onkeydown = (e) => { return this.handleKeyDown(e) };
        canvas.oncontextmenu = () => { return false; }; // disable right click menu

        // let reset = document.getElementById('reset');
        // reset.onclick = (e) => { this.handleReset(e) };

        this.onresize = (e) => { this.handleResize(e) };
    }
}

module.exports = { UICanvasView }
},{"../model/Model":6,"./ButtonGroup":8,"./CanvasButton":9}],12:[function(require,module,exports){
class UIElement {
    draw(ctx) { };
    isClicked(mouseX, mouseY) { return false };
    click(e, x, y) { };
};
module.exports = { UIElement };
},{}]},{},[3]);
