const SNS = 'http://www.w3.org/2000/svg';

const TRIANGLES = [
    '0,0 16,0 24,24 0,16',
    '16,0 32,0 24,24',
    '32,0 48,0 48,16 24,24',
    '48,16 48,32 24,24',
    '48,32 48,48 32,48 24,24',
    '24,24 32,48 16,48',
    '24,24 16,48 0,48 0,32',
    '0,16 24,24 0,32',
];

const DIRECTIONS = ['NW', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W'];

class Board {
    constructor(container) {
        this.container = container;
        this.aggregates = undefined;
        this.color = 'white';
        this.pieces = ['K', 'Q', 'R', 'B', 'N', 'p'];
        this.view = 'positional';
        this.maxMoves = null;
        this.moveBoundaries = [0, null];
    }

    setMoveBoundaries(boundaries) {
        this.moveBoundaries = boundaries;
        this.drawHeatMap();
    }

    initialize() {
        for (let rowIndex = 0; rowIndex < 8; rowIndex++) {
            let row = document.createElement('div');
            row.classList.add('board-row');
            for (let colIndex = 0; colIndex < 8; colIndex++) {
                let svg = document.createElementNS(SNS, 'svg');
                svg.classList.add('board-cell');
                svg.classList.add(getSquareName(rowIndex, colIndex));
                row.append(svg);
            }
            this.container.append(row);
        }
    }

    loadPlayer(uri) {
        let that = this;
        fetch(uri).then(function(response) {
            response.text().then(function(text) {
                that.aggregates = JSON.parse(text);
                that.refreshMaxMove();
                that.drawHeatMap();
            });
        });
    }

    setView(view) {
        if (this.view == view) {
            return;
        }
        if (view == 'positional') {
            this.setPositionalView();
        }
        else {
            this.setDirectionalView();
        }
        this.view = view;
        this.drawHeatMap();
    }

    setDirectionalView() {
        for (let cell of this.container.querySelectorAll('.board-cell')) {
            for (let points of TRIANGLES) {
                let triangle = document.createElementNS(SNS, 'polygon');
                triangle.setAttribute('points', points);
                cell.append(triangle);
            }
        }
    }

    setPositionalView() {
        for (let cell of this.container.querySelectorAll('.board-cell')) {
            while(cell.hasChildNodes()) {
                cell.removeChild(cell.firstChild);
            }
        }
    }

    setColor(color) {
        this.color = color;
        this.refreshMaxMove();
        this.drawHeatMap(); 
    }

    refreshMaxMove() {
        let maxMoves = this.aggregates[this.color].length;
        if (maxMoves != this.maxMoves) {
            this.maxMoves = maxMoves;
            if (this.moveBoundaries[1] == null) {
                this.moveBoundaries[1] = this.maxMoves;
            }
            this.container.dispatchEvent(new Event('maxMovesUpdated'));
        }
    }

    setPieces(pieces) {
        this.pieces = pieces;
        this.drawHeatMap();
    }

    drawHeatMap() {
        let minMove, maxMove;
        [minMove, maxMove] = this.moveBoundaries;

        let totalMoves = 0;
        let hitsMap = {};
        for (let moves of this.aggregates[this.color].slice(minMove, maxMove)) {
            for (let square of Object.keys(moves)) {
                let squareAggregates = moves[square];
                let agg;
                if (this.view == 'positional') {
                    agg = this.positionalSquareAggregator(square, squareAggregates, hitsMap);
                }
                else {
                    agg = this.directionalSquareAggregator(square, squareAggregates, hitsMap);
                }
                totalMoves += agg;
            }
        }

        let maxHits = 0;
        for (let hitKey of Object.keys(hitsMap)) {
            if (hitsMap[hitKey] > maxHits) {
                maxHits = hitsMap[hitKey];
            }
        }

        if (this.view == 'positional') {
            this.resetPositionalIntensities();
        }
        else {
            this.resetDirectionalIntensities();
        }
        for (let hitKey of Object.keys(hitsMap)) {
            let hits = hitsMap[hitKey];
            let intensity = Math.floor(hits*255/maxHits);

            if (this.view == 'positional') {
                this.positionalIntensitiesSetter(hitKey, intensity);
            }
            else {
                this.directionalIntensitiesSetter(hitKey, intensity);
            }
        }
    }

    // Positional Heatmap
    positionalSquareAggregator(square, squareAggregates, hitsMap) {
        if (!('_' in squareAggregates)) {
            return 0;
        }
        let hits = sumForKeys(squareAggregates['_'], this.pieces);
        if (!(square in hitsMap)) {
            hitsMap[square] = 0;
        }
        hitsMap[square] += hits
        return hits;
    }

    resetPositionalIntensities() {
        for (let square of this.container.querySelectorAll('.board-cell')) {
            square.style.backgroundColor = 'black';
        }
    }

    positionalIntensitiesSetter(hitKey, intensity) {
        let square = this.container.querySelector('.'+hitKey);
        let color = getIntensityRGB(intensity);
        square.style.backgroundColor = color;
    }

    // Directional Heatmap
    directionalSquareAggregator(square, squareAggregates, hitsMap) {
        let totalMoves = 0;
        for (let direction of Object.keys(squareAggregates)) {
            if (direction == '_') {
                continue;
            }
            let hits = sumForKeys(squareAggregates[direction], this.pieces);
            let hitKey = [square, direction].join('-');
            if (!(hitKey in hitsMap)) {
                hitsMap[hitKey] = 0;
            }
            hitsMap[hitKey] += hits;
            totalMoves += hits;
        }
        return totalMoves;
    }

    resetDirectionalIntensities() {
        for (let square of this.container.querySelectorAll('.board-cell')) {
            for (let triangle of square.querySelectorAll('polygon')) {
                triangle.setAttribute('fill', 'black');
            }
        }
    }

    directionalIntensitiesSetter(hitKey, intensity) {
        let square, direction;
        [square, direction] = hitKey.split('-');
        this.setSquareDirectionIntensity(square, direction, intensity);
    }

    setSquareDirectionIntensity(squareName, direction, intensity) {
        let square = this.container.querySelector('.'+squareName);
        let triangleIndex = DIRECTIONS.indexOf(direction);
        let triangle = square.querySelectorAll('polygon')[triangleIndex];
        let color = getIntensityRGB(intensity);
        triangle.setAttribute('fill', color);
    }

}


// Utils 

function getSquareName(rowIndex, colIndex) {
    return [
        'a', 'b',  'c', 'd', 'e', 'f', 'g', 'h'
    ][colIndex] + (8 - rowIndex);
}


function sumForKeys(obj, keys) {
    let sum = 0;
    for (let key of keys) {
        if (!(obj.hasOwnProperty(key))) {
            continue;
        }
        sum += obj[key];
    }
    return sum;
}


function getIntensityRGB(intensity) {
    return 'rgb(0, 0, '+intensity+')';
}
