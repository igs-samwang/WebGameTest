const gridSize = 7;
const colors = ['red', 'green', 'blue'];
let board = []; // 每格資料 { color, fall }
let startTime = null; // 記錄遊戲開始時間
let isAnimating = false; // 當動畫進行時禁止點擊
let moveCount = 0; // 記錄玩家的步數

// 初始建立格子，並同步更新 board 與 DOM
function createGrid() {
    board = [];
    moveCount = 0; // 重設步數
    startTime = Date.now(); // 遊戲開始時間
    const gridContainer = document.getElementById('grid');
    gridContainer.innerHTML = '';
    // 清除結果訊息區（如果存在）
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
        resultDiv.innerHTML = '';
    }
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
    // 新增旋轉按鈕
    addRotationButtons();
}

function handleCellClick(event) {
    if (isAnimating) return; // 正在動畫中，忽略點擊
    const cellEl = event.target;
    const row = parseInt(cellEl.dataset.row);
    const col = parseInt(cellEl.dataset.col);
    const cellData = board[row][col];
    // 若該格為空，不進行消除
    if (!cellData) return;
    
    // 每次有效點擊後累計步數
    moveCount++;
    
    isAnimating = true;
    const color = cellData.color;
    // Flood Fill：取得所有連通、同色的格子
    const region = getConnectedRegion(row, col, color);
    if (region.length > 0) {
        // 對每個需消除的格子建立 Promise，等待 fade out 動畫結束
        const animationPromises = region.map(pos => {
            return new Promise(resolve => {
                const targetCell = getCellElement(pos.row, pos.col);
                if (targetCell) {
                    // 先移除舊動畫，再強制 reflow 重啟動畫
                    targetCell.classList.remove('removing');
                    void targetCell.offsetWidth;
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
            refreshGrid(); // refreshGrid 裡會處理 falling 動畫完後解除鎖定
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
    // 儲存目前 gridContainer 的尺寸
    const fixedWidth = gridContainer.offsetWidth;
    const fixedHeight = gridContainer.offsetHeight;
    
    // 清空舊內容並維持固定尺寸與隱藏溢出
    gridContainer.innerHTML = '';
    gridContainer.style.width = fixedWidth + "px";
    gridContainer.style.height = fixedHeight + "px";
    gridContainer.style.overflow = 'hidden';
    
    const cellFallUnit = 54; // 單位高度+間距

    // 重新繪製所有格子
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
                    cellEl.addEventListener('animationend', () => {
                        cellEl.classList.remove('fall');
                    }, { once: true });
                }
            }
            rowEl.appendChild(cellEl);
        }
        gridContainer.appendChild(rowEl);
    }

    // 確保不會有 scroll bar 出現
    gridContainer.style.overflow = 'hidden';

    // 落下動畫可能仍在進行，等待結束後再綁定點擊事件
    const fallingCells = document.querySelectorAll('.cell.fall');
    if (fallingCells.length > 0) {
        let fallPromises = [];
        fallingCells.forEach(cell => {
            fallPromises.push(new Promise(resolve => {
                cell.addEventListener('animationend', resolve, { once: true });
            }));
        });
        Promise.all(fallPromises).then(() => {
            document.querySelectorAll('.cell').forEach(cell => {
                cell.addEventListener('click', handleCellClick);
            });
            isAnimating = false;
            checkCompletion();
        });
    } else {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.addEventListener('click', handleCellClick);
        });
        isAnimating = false;
        checkCompletion();
    }
}

// 檢查所有有顏色的格子是否都已消失，若完成則顯示結果訊息與 [再來一局] 按鈕
function checkCompletion() {
    let completed = true;
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (board[i][j] !== null) {
                completed = false;
                break;
            }
        }
        if (!completed) break;
    }
    if (completed) {
        let elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
        let resultDiv = document.getElementById('result');
        if (!resultDiv) {
            resultDiv = document.createElement('div');
            resultDiv.id = 'result';
            const gridContainer = document.getElementById('grid');
            gridContainer.parentNode.insertBefore(resultDiv, gridContainer);
        }
        resultDiv.innerHTML = `Complete!<br><br>
                                完成秒數: ${elapsedSeconds}<br><br>
                                完成步數: ${moveCount}<br><br>
                                <button id="restartBtn">再來一局</button><br><br>`;
        document.getElementById('restartBtn').addEventListener('click', () => {
            resultDiv.innerHTML = '';
            createGrid();
        });
    }
}

function addRotationButtons() {
    let rotateContainer = document.getElementById('rotateButtons');
    const gridContainer = document.getElementById('grid');
    if (!rotateContainer) {
        rotateContainer = document.createElement('div');
        rotateContainer.id = 'rotateButtons';
        // 設定與 grid 相同的寬度
        rotateContainer.style.width = gridContainer.offsetWidth + "px";
        // 使用 flex 排版，置中對齊
        rotateContainer.style.display = 'flex';
        rotateContainer.style.justifyContent = 'center';
        rotateContainer.style.alignItems = 'center';
        rotateContainer.style.marginTop = '10px';
        const gridParent = gridContainer.parentNode;
        gridParent.appendChild(rotateContainer);
    }
    // 每次重繪時更新容器寬度以保持對齊
    rotateContainer.style.width = gridContainer.offsetWidth + "px";
    // 清空舊按鈕
    rotateContainer.innerHTML = '';

    const leftBtn = document.createElement('button');
    leftBtn.id = 'rotateLeft';
    leftBtn.textContent = '左轉';
    leftBtn.style.textAlign = 'center';
    // 加入右側間距
    leftBtn.style.marginRight = '100px';
    leftBtn.style.width = '150px';
    leftBtn.style.height = '50px';
    leftBtn.addEventListener('click', () => rotateGrid('left'));

    const rightBtn = document.createElement('button');
    rightBtn.id = 'rotateRight';
    rightBtn.textContent = '右轉';
    rightBtn.style.textAlign = 'center';
    rightBtn.style.width = '150px';
    rightBtn.style.height = '50px';
    rightBtn.addEventListener('click', () => rotateGrid('right'));

    rotateContainer.appendChild(leftBtn);
    rotateContainer.appendChild(rightBtn);
}

function rotateGrid(direction) {
    if (isAnimating) return;
    isAnimating = true;
    
    // 在旋轉期間禁用整個頁面的滾動條
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    const gridContainer = document.getElementById('grid');
    // 固定容器尺寸，避免重排導致滾動條出現
    gridContainer.style.width = gridContainer.offsetWidth + "px";
    gridContainer.style.height = gridContainer.offsetHeight + "px";
    gridContainer.style.overflow = 'hidden';
    
    // 使用 GPU 加速並設定旋轉原點
    gridContainer.style.willChange = "transform";
    gridContainer.style.backfaceVisibility = "hidden";
    gridContainer.style.transformOrigin = 'center center';
    
    // 禁用所有 cell 點擊
    document.querySelectorAll('.cell').forEach(cell => {
        cell.removeEventListener('click', handleCellClick);
    });
    
    // 進行旋轉動畫（90°），動畫時間 0.5s
    gridContainer.style.transition = "transform 0.5s ease";
    gridContainer.style.transform = direction === 'left' ? "rotate(-90deg)" : "rotate(90deg)";
    
    gridContainer.addEventListener('transitionend', function rotateHandler() {
        gridContainer.removeEventListener('transitionend', rotateHandler);
        // 重置 transform 設定
        gridContainer.style.transition = "";
        gridContainer.style.transform = "";
        
        // 根據方向更新 board (矩陣旋轉 90°)
        board = rotateBoard(board, direction);
        // 更新後應用重力並重繪 grid
        applyGravity();
        refreshGrid();
        
        // 還原頁面滾動條設定
        document.body.style.overflow = originalBodyOverflow;
        isAnimating = false;
    }, { once: true });
}

function rotateBoard(oldBoard, direction) {
    let newBoard = [];
    for (let i = 0; i < gridSize; i++) {
        newBoard[i] = new Array(gridSize).fill(null);
    }
    if (direction === 'left') {
        // 逆時針旋轉：newBoard[i][j] = oldBoard[j][gridSize - 1 - i]
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                newBoard[i][j] = oldBoard[j][gridSize - 1 - i];
            }
        }
    } else {
        // 順時針旋轉：newBoard[i][j] = oldBoard[gridSize - 1 - j][i]
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                newBoard[i][j] = oldBoard[gridSize - 1 - j][i];
            }
        }
    }
    return newBoard;
}

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    startBtn.addEventListener('click', () => {
        startBtn.style.display = 'none';
        createGrid();
    });
});