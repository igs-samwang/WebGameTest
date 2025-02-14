const gridSize = 5;
const colors = ['red', 'green', 'blue'];
let board = []; // 每格資料 { color, fall }

// 初始建立格子，並同步更新 board 與 DOM
function createGrid() {
    board = [];
    const gridContainer = document.getElementById('grid');
    gridContainer.innerHTML = '';
    for (let i = 0; i < gridSize; i++) {
        board[i] = [];
        const rowEl = document.createElement('div');
        rowEl.className = 'row';
        for (let j = 0; j < gridSize; j++) {
            const cellEl = document.createElement('div');
            cellEl.className = 'cell';
            // 隨機取得顏色
            const color = colors[Math.floor(Math.random() * colors.length)];
            board[i][j] = { color: color, fall: 0 };
            cellEl.style.backgroundColor = color;
            cellEl.dataset.row = i;
            cellEl.dataset.col = j;
            // 直接附加點擊事件
            cellEl.addEventListener('click', handleCellClick);
            rowEl.appendChild(cellEl);
        }
        gridContainer.appendChild(rowEl);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    startBtn.addEventListener('click', () => {
        startBtn.style.display = 'none';
        createGrid();
    });
});

function handleCellClick(event) {
    const cellEl = event.target;
    const row = parseInt(cellEl.dataset.row);
    const col = parseInt(cellEl.dataset.col);
    const cellData = board[row][col];
    // 若該格為空，不進行消除
    if (!cellData) return;
    const color = cellData.color;
    // Flood Fill：取得所有連通、同色的格子
    const region = getConnectedRegion(row, col, color);
    if (region.length > 0) {
        // 對每個需消除的格子建立 Promise，等待 fade out 動畫結束
        const animationPromises = region.map(pos => {
            return new Promise(resolve => {
                const targetCell = getCellElement(pos.row, pos.col);
                if (targetCell) {
                    // 先移除已存在的消除動畫，再透過 reflow 重啟動畫
                    targetCell.classList.remove('removing');
                    void targetCell.offsetWidth; // 強制 reflow
                    targetCell.classList.add('removing');
                    targetCell.addEventListener('animationend', () => {
                        targetCell.classList.remove('removing');
                        resolve();
                    }, { once: true });
                } else {
                    resolve();
                }
            });
        });
        // 等所有動畫完成後，再更新 board 並重繪
        Promise.all(animationPromises).then(() => {
            region.forEach(pos => {
                board[pos.row][pos.col] = null;
            });
            // 清除可能遺留的 .removing class
            document.querySelectorAll('.cell.removing').forEach(cell => cell.classList.remove('removing'));
            applyGravity();
            refreshGrid();
        });
    }
}

function getConnectedRegion(row, col, color) {
    let visited = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
    let region = [];
    let stack = [{ row, col }];
    while (stack.length > 0) {
        let { row: r, col: c } = stack.pop();
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
        if (visited[r][c]) continue;
        visited[r][c] = true;
        if (!board[r][c] || board[r][c].color !== color) continue;
        region.push({ row: r, col: c });
        stack.push({ row: r - 1, col: c });
        stack.push({ row: r + 1, col: c });
        stack.push({ row: r, col: c - 1 });
        stack.push({ row: r, col: c + 1 });
    }
    return region;
}

function getCellElement(row, col) {
    return document.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
}

// 模擬重力：每欄從下往上排列，保留空格（null 不補新色）
function applyGravity() {
    for (let col = 0; col < gridSize; col++) {
        let newCol = new Array(gridSize).fill(null);
        let newRow = gridSize - 1; // 自底部開始
        for (let row = gridSize - 1; row >= 0; row--) {
            if (board[row][col] !== null) {
                const fallDistance = newRow - row;
                newCol[newRow] = { color: board[row][col].color, fall: fallDistance };
                newRow--;
            }
        }
        for (let row = 0; row < gridSize; row++) {
            board[row][col] = newCol[row];
        }
    }
}

// 重繪 grid：根據 board 內容產生新 DOM，每個 cell 附加 click 事件
function refreshGrid() {
    const gridContainer = document.getElementById('grid');
    gridContainer.innerHTML = '';
    const cellFallUnit = 54; // 單位高度+間距
    for (let i = 0; i < gridSize; i++) {
        const rowEl = document.createElement('div');
        rowEl.className = 'row';
        for (let j = 0; j < gridSize; j++) {
            const cellEl = document.createElement('div');
            cellEl.className = 'cell';
            cellEl.dataset.row = i;
            cellEl.dataset.col = j;
            if (board[i][j] === null) {
                cellEl.style.backgroundColor = 'white';
            } else {
                const cellData = board[i][j];
                cellEl.style.backgroundColor = cellData.color;
                if (cellData.fall > 0) {
                    cellEl.classList.add('fall');
                    cellEl.style.setProperty('--fallDistance', `-${cellData.fall * cellFallUnit}px`);
                    // 落下動畫完成後移除 .fall class，使 cell 可點擊
                    cellEl.addEventListener('animationend', () => {
                        cellEl.classList.remove('fall');
                    }, { once: true });
                }
            }
            // 附加 click 事件確保 cell 可正常響應
            cellEl.addEventListener('click', handleCellClick);
            rowEl.appendChild(cellEl);
        }
        gridContainer.appendChild(rowEl);
    }
}