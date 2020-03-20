const blit = ({type='div', textContent, className, id, parent, update, style} = {}) => {
    const element = document.createElement(type);
    if(textContent !== undefined) {
        element.textContent = textContent;
    }
    if(className !== undefined) {
        element.className = className;
    }
    if(id !== undefined){
        element.id = id;
    }
    if(parent !== undefined) {
        parent.appendChild(element);
    }
    if(update !== undefined) {
        element.update = (...args) => update(element, ...args);
    }
    if(style !== undefined) {
        Object.keys(style).forEach(key => {
            element.style[key] = style[key];
        })
    }
    return element;
}

document.body.style.margin = 0;
document.body.style.display = 'flex';
document.body.style.flexDirection = 'row';
document.body.style.width = '100%';
document.body.style.height = '100%';
document.body.style.position = 'relative';

const UIPanels = blit({id: 'uiPanels', parent: document.body, style: {flex: '1 1 auto', flexDirection: 'column', display: 'flex'}});
const Log = blit({id: 'log', parent: document.body, style: {flex: '0 0 250px', overflowY: 'auto', height: '100%', borderLeft: '1px solid black'}});

const toCents = val => (Math.floor(val * 100 + .5) / 100).toFixed(2);
const statusE = blit({id: 'status', parent: UIPanels, style: {flex: '0 0 auto', width: '100%', height: 'fit-content', borderBottom: '1px solid black', display: 'flex', justifyContent: 'space-between'}});
const genStatus = (id, label, cash = false) => blit({id, parent: statusE, style: {flex: '0 0 auto', padding: '10px'}, update: (element, value) => {
    element.textContent = `${label}: ${cash ? toCents(value) : value}`
}})
const cashE = genStatus('cash', 'Cash', true);
const rollsE = genStatus('rolls', 'Rolls');
const tunaCansE = genStatus('tunaCans', 'Tuna Cans');
const emptyCansE = genStatus('emptyCans', 'Empty Cans (Score)');
const barrelsE = genStatus('barrels', 'Barrels');

const inventory = {
    cash: 10,
    rolls: 0,
    tunaCans: 0,
    emptyCans: 0,
    barrels: 0
}

cashE.update(10);
[rollsE, tunaCansE, emptyCansE, barrelsE].forEach(elem => elem.update(0));

const BUILD = 'BUILD';
const PLACING_BARREL = 'PLACING_BARREL';
const DIGGING_BARREL = 'DIGGING_BARREL';
const SURVIVING = 'SURVIVING';
let mode = BUILD;

const grid = [];
const gridE = blit({id: 'grid', style: {width: '100%', flex: '1 0 auto', height: 'auto', backgroundColor: 'rgba(0, 0, 0, .15)', display: 'flex', flexDirection: 'column'}, parent: UIPanels});
for(let i = 0; i < 10; i ++) {
    const row = [];
    const rowE = blit({parent: gridE, style: {flex: '1 0 0', display: 'flex', flexDirection: 'row'}});
    for(let j = 0; j < 10; j++) {
        const cell = blit({parent: rowE, style: {flex: '1 0 0', border: '1px solid black', whiteSpace: 'pre-wrap'}, update: (element, value) => {
            element.textContent = value.length === 0
                ? ''
                : `Barrels: ${value.length}\nTotal Rolls: ${value.reduce((acc, count) => acc + count, 0)}`
        }});
        cell.addEventListener('click', () => {
            if(mode === PLACING_BARREL) {
                const count = Math.min(144, inventory.rolls);
                inventory.rolls -= count;
                inventory.barrels -= 1;
                barrelsE.update(inventory.barrels);
                rollsE.update(inventory.rolls);
                cell.barrels.push(count);
                cell.update(cell.barrels); 
                lBlit(`Buried ${count} at [${i}, ${j}]`);
                placeBarrelE.update();
                mode = BUILD;
            }
            if(mode === DIGGING_BARREL) {
                if(cell.barrels.length === 0) {
                    lBlit('No TP buried here!');
                    digBarrelE.update();
                    mode = BUILD;
                } else {
                    const count = cell.barrels.pop();
                    inventory.rolls += count;
                    inventory.barrels += 1;
                    rollsE.update(inventory.rolls);
                    barrelsE.update(inventory.barrels);
                    lBlit(`Recovered ${count} from the earth!`);
                    cell.update(cell.barrels);
                    digBarrelE.update();
                    mode = BUILD;
                }
            }
        })
        cell.barrels = [];
        row.push(cell);
    }
    grid.push(row);
}

const prices = {
    rollGross: 3,
    tunaCanDz: 2,
    barrel: 1,
    rollSell: 3 / 144
}

const store = blit({id: 'store', parent: UIPanels, style: {flex: '0 0 auto', display: 'flex', flexWrap: 'wrap'}});
const genBuyButton = (id, formatter) => blit({parent: store, id, update: (element, value) => {
    element.textContent = formatter(value);
}, style: {
    flex: '0 0 auto',
    width: '200px',
    border: '3px solid black',
    margin: '10px',
    userSelect: 'none'
}});

const buyBarrelE = genBuyButton('buyBarrel', (value) => `Buy Barrel ($${toCents(value)})`);
const buyRollE = genBuyButton('buyRoll', (value) => `Buy 1 Gross TP ($${toCents(value)}) : ($${toCents(value/144)}/each)`);
const buyTunaCanE = genBuyButton('buyTunaCan', (value) => `Buy 1 Dozen Tuna Cans ($${toCents(value)}) : ($${toCents(value/12)}/each)`)
const placeBarrelE = genBuyButton('placeBarrel', () => `Bury Barrel of TP`);
const digBarrelE = genBuyButton('digBarrel', () => 'Dig Barrel of TP');
const sellRollE = genBuyButton('sellRoll', (value) => `Sell one dozen rolls on the open market! ($${toCents(value * 12)}) : ($${toCents(value * 144)} / gross)`)
const surviveE = genBuyButton('survive', () => `Survive 1 day (requires 1 can of tuna)!`);

buyBarrelE.update(prices.barrel);
buyRollE.update(prices.rollGross);
buyTunaCanE.update(prices.tunaCanDz);
placeBarrelE.update();
digBarrelE.update();
sellRollE.update(prices.rollSell);
surviveE.update();

buyBarrelE.addEventListener('click', () => {
    if(mode === BUILD && inventory.cash >= prices.barrel) {
        inventory.barrels += 1;
        inventory.cash -= +toCents(prices.barrel);
        cashE.update(inventory.cash);
        barrelsE.update(inventory.barrels);
    }
});

buyRollE.addEventListener('click', () => {
    if(mode === BUILD && inventory.cash >= prices.rollGross) {
        inventory.rolls += 144;
        inventory.cash -= +toCents(prices.rollGross);
        cashE.update(inventory.cash);
        rollsE.update(inventory.rolls);
    }
});

buyTunaCanE.addEventListener('click', () => {
    if(mode === BUILD && inventory.cash >= prices.tunaCanDz) {
        inventory.tunaCans += 12;
        inventory.cash -= +toCents(prices.tunaCanDz);
        cashE.update(inventory.cash);
        tunaCansE.update(inventory.tunaCans);
    }
});

placeBarrelE.addEventListener('click', () => {
    if(mode === BUILD && inventory.barrels > 0 && inventory.rolls > 0) {
        mode = PLACING_BARREL;
        placeBarrelE.textContent = 'CANCEL';
    } else 
    if(mode === PLACING_BARREL) {
        mode = BUILD;
        placeBarrelE.update();
    }
});

digBarrelE.addEventListener('click', () => {
    if(mode === BUILD) {
        mode = DIGGING_BARREL;
        digBarrelE.textContent = 'CANCEL';
    } else
    if(mode === DIGGING_BARREL) {
        mode = BUILD;
        digBarrelE.update();
    }
});

sellRollE.addEventListener('click', () => {
    if(mode === BUILD && inventory.rolls >= 12) {
        inventory.rolls -= 12;
        inventory.cash += +toCents(prices.rollSell * 12);
        rollsE.update(inventory.rolls);
        cashE.update(inventory.cash);
    }
})

const lBlit = (message) => {
    blit({parent: Log, textContent: message, style: {padding: '5px', borderBottom: '1px solid grey'}});
    Log.scrollTop = Log.scrollHeight;
};

const GREMLINS = [];

let ticks = 0;

const survive = () => {
    if(inventory.tunaCans > 0) {
        ticks += 1;


        prices.rollSell = Math.random() * Math.random() * Math.random() / 10;
        prices.rollGross = Math.max(Math.ceil(prices.rollSell * 144), Math.ceil(Math.random() * 2) + 2);
        buyRollE.update(prices.rollGross);
        sellRollE.update(prices.rollSell);

        GREMLIN_WAS = new Set(GREMLINS.map(({x, y}) => `${x}:${y}`));
        if(ticks % 10 === 0) {
            const SPAWNS = [[0, 0], [0, 9], [9, 0], [9, 9]];
            const validSpawns = SPAWNS.filter(([x, y]) => !GREMLINS.some(gremlin => x === gremlin.x && y === gremlin.y));
            if(validSpawns.length === 0) {
                lBlit('No valid gremlin spawns!, Lucky You!');
            } else {
                const spawn = validSpawns[Math.floor(Math.random() * validSpawns.length)];
                GREMLINS.push({x: spawn[0], y: spawn[1]});
                lBlit(`A HORDE OF LOOTERS APPEARS AT [${spawn[0]},${spawn[1]}]!!!`)
            }
        }

        GREMLINS.forEach(({x, y}, i) => {
            const dX = (options => options[Math.floor(Math.random() * options.length)])(x === 0 ? [1, 0] : x === 9 ? [-1, 0] : [1, -1, 0]);
            const dY = (options => options[Math.floor(Math.random() * options.length)])([...(y === 0 ? [1] : y === 9 ? [-1] : [1, -1]), ...(dX === 0 ? [] : [0])]);

            GREMLINS[i] = {x: x + dX, y: y + dY};
        });
        GREMLIN_IS = new Set(GREMLINS.map(({x, y}) => `${x}:${y}`));

        GREMLIN_WAS.forEach(coord => {
            if(!GREMLIN_IS.has(coord)) {
                const [x, y] = coord.split(':');
                grid[x][y].style.backgroundColor = 'grey';
            }
        });
        GREMLIN_IS.forEach(coord => {
            if(!GREMLIN_WAS.has(coord)) {
                const [x, y] = coord.split(':');
                grid[x][y].style.backgroundColor = 'red';
                grid[x][y].visited = true;
            }
        });
        GREMLINS.forEach(({x, y}) => {
            if(grid[x][y].barrels.length > 0) {
                const theft = grid[x][y].barrels.reduce((acc, count) => acc + count, 0);
                grid[x][y].barrels = [];
                grid[x][y].update(grid[x][y].barrels);
                lBlit(`Marauding looters have stumpled across your cache of ${theft} rolls! Now the precious resources have been lost in time, like tears in rain.`)
            }
        })

        inventory.tunaCans -= 1;
        inventory.emptyCans += 1;
        tunaCansE.update(inventory.tunaCans);
        emptyCansE.update(inventory.emptyCans);
        lBlit('Survived 1 day and ate 1 can of tuna!');
        if(inventory.rolls > 0) {
            inventory.rolls = 0;
            rollsE.update(inventory.rolls);
            lBlit('All your unburied TP was stolen by marauders!');
        }
        mode = BUILD;
    } else {
        mode = BUILD;
        lBlit('NO TUNA ::: SURVIVAL ATTEMPT SKIPPED');
    }
}
surviveE.addEventListener('click', () => {
    if(mode === BUILD) {
        mode = SURVIVING;
        survive();
    }
})
