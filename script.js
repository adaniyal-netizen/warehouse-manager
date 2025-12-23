// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDPVR4T84AH5C3Fh2Ym4RHFIXP-B7TZ6Jo",
    authDomain: "warehouse-stock-60cd3.firebaseapp.com",
    databaseURL: "https://warehouse-stock-60cd3-default-rtdb.firebaseio.com",
    projectId: "warehouse-stock-60cd3",
    storageBucket: "warehouse-stock-60cd3.firebasestorage.app",
    messagingSenderId: "1062950020124",
    appId: "1:1062950020124:web:c56f2f9530c372f93b6bd9",
    measurementId: "G-2NRSZ2XF6X"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const dbRef = db.ref('inventory');

let inventory = [];
let currentFilter = 'all'; 

dbRef.on('value', (snapshot) => {
    const data = snapshot.val();
    inventory = data || [];
    
    inventory.forEach(item => {
        if (!item.deliveryLog) item.deliveryLog = [];
        if (item.isStarred === undefined) item.isStarred = false; 
        if (item.damaged === undefined) item.damaged = 0; 
        if (item.damagedImg === undefined) item.damagedImg = "";
        if (item.returnId === undefined) item.returnId = "";
        if (item.returnMethod === undefined) item.returnMethod = "Fedex Pickup Return";
        if (item.returnStatus === undefined) item.returnStatus = "Pending";
    });
    
    refreshView(); 
});

const tableHead = document.querySelector('#inventoryTable thead');
const tableBody = document.querySelector('#inventoryTable tbody');
const searchInput = document.getElementById('searchInput');
const itemModal = document.getElementById('itemModal');
const deliveryModal = document.getElementById('deliveryModal');
const damageModal = document.getElementById('damageModal');
const addForm = document.getElementById('addForm');
const deliveryForm = document.getElementById('deliveryForm');
const damageForm = document.getElementById('damageForm');
const editIndexInput = document.getElementById('editIndex');
const deliveryIndexInput = document.getElementById('deliveryIndex');
const deliveryItemName = document.getElementById('deliveryItemName');
const historyList = document.getElementById('historyList');

const tabAll = document.getElementById('tabAll');
const tabStarred = document.getElementById('tabStarred');
const tabDamaged = document.getElementById('tabDamaged');

function saveData() {
    dbRef.set(inventory).catch((error) => { alert("Error saving data: " + error.message); });
}

window.switchTab = (mode) => {
    currentFilter = mode;
    tabAll.classList.remove('active');
    tabStarred.classList.remove('active');
    tabDamaged.classList.remove('active');
    if (mode === 'all') tabAll.classList.add('active');
    if (mode === 'starred') tabStarred.classList.add('active');
    if (mode === 'damaged') tabDamaged.classList.add('active');
    refreshView();
};

function refreshView() {
    const term = searchInput.value.toLowerCase();
    let filtered = inventory.filter(item => 
        item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term)
    );

    if (currentFilter === 'damaged') {
        tableHead.innerHTML = `
            <tr>
                <th style="width: 50px;">Fav</th> 
                <th style="width: 80px;">Image</th>
                <th>Return Order ID</th>
                <th>Return Method</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        `;
        filtered = filtered.filter(item => item.damaged > 0);
    } else {
        tableHead.innerHTML = `
            <tr>
                <th style="width: 50px;">Fav</th> 
                <th style="width: 80px;">Image</th>
                <th>Product Details</th>
                <th>Status</th>
                <th>Stock Levels</th>
                <th>Delivered History (Log)</th>
                <th>Actions</th>
            </tr>
        `;
        if (currentFilter === 'starred') filtered = filtered.filter(item => item.isStarred === true);
    }

    renderTable(filtered);
}

function renderTable(data) {
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No items found.</td></tr>';
        return;
    }

    data.forEach((item) => {
        const realIndex = inventory.indexOf(item); 
        const isDamagedView = (currentFilter === 'damaged');
        const starClass = item.isStarred ? 'fa-solid starred' : 'fa-regular';
        let displayImg = item.image;
        if (isDamagedView && item.damagedImg) displayImg = item.damagedImg;

        let rowHtml = '';

        if (isDamagedView) {
            // *** DAMAGED / RETURN VIEW ***
            rowHtml = `
            <tr class="damaged-row">
                <td style="text-align:center;">
                    <button class="btn-star ${item.isStarred ? 'starred' : ''}" onclick="toggleStar(${realIndex})">
                        <i class="${starClass} fa-star"></i>
                    </button>
                </td>
                
                <td><img src="${displayImg}" class="product-img" alt="img" style="border: 2px solid #ef4444;"></td>
                
                <td>
                    <div style="font-weight:bold; margin-bottom:5px;">${item.name}</div>
                    <input type="text" class="table-input" value="${item.returnId}" placeholder="Enter Return ID..." onchange="updateDamageInfo(${realIndex}, 'returnId', this.value)">
                </td>
                
                <td>
                    <select class="table-select" onchange="updateDamageInfo(${realIndex}, 'returnMethod', this.value)">
                        <option value="Fedex Pickup Return" ${item.returnMethod === 'Fedex Pickup Return' ? 'selected' : ''}>Fedex Pickup Return</option>
                        <option value="Return To Store" ${item.returnMethod === 'Return To Store' ? 'selected' : ''}>Return To Store</option>
                        <option value="No Need To Return" ${item.returnMethod === 'No Need To Return' ? 'selected' : ''}>No Need To Return</option>
                    </select>
                </td>
                
                <td>
                     <select class="table-select" onchange="updateDamageInfo(${realIndex}, 'returnStatus', this.value)" style="${item.returnStatus === 'Pending' ? 'color:#d97706; font-weight:bold;' : 'color:#22c55e; font-weight:bold;'}">
                        <option value="Pending" ${item.returnStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Returned" ${item.returnStatus === 'Returned' ? 'selected' : ''}>Returned</option>
                    </select>
                    <div style="margin-top:5px; font-size:0.8rem; color:#ef4444;">Qty: ${item.damaged}</div>
                </td>

                <td>
                    <button onclick="deleteItem(${realIndex})" class="btn-icon" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        } else {
            // *** NORMAL VIEW ***
            const totalDelivered = item.deliveryLog ? item.deliveryLog.reduce((sum, log) => sum + log.qty, 0) : 0;
            const isLow = item.available < 10;
            const statusClass = isLow ? 'badge-low' : 'badge-ok';
            const statusText = isLow ? 'Low Stock' : 'In Stock';
            let lastInfo = "No history";
            if (item.deliveryLog && item.deliveryLog.length > 0) {
                const lastLog = item.deliveryLog[item.deliveryLog.length - 1];
                const d = new Date(lastLog.date);
                lastInfo = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
            }

            rowHtml = `
            <tr>
                <td style="text-align:center;">
                    <button class="btn-star ${item.isStarred ? 'starred' : ''}" onclick="toggleStar(${realIndex})">
                        <i class="${starClass} fa-star"></i>
                    </button>
                </td>

                <td><img src="${item.image}" class="product-img" alt="img" onerror="this.src='https://via.placeholder.com/60?text=No+Img'"></td>
                
                <td>
                    <div style="font-weight:bold; font-size:1.05rem;">${item.name}</div>
                    <div style="color:#64748b; font-size:0.85rem;">SKU: ${item.sku}</div>
                </td>
                
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                
                <td>
                    <div class="stock-control">
                        <button class="btn-icon" onclick="updateAvailable(${realIndex}, -1)">-</button>
                        <input type="number" class="stock-input" value="${item.available}" onchange="manualStockUpdate(${realIndex}, this.value)">
                        <button class="btn-icon" onclick="updateAvailable(${realIndex}, 1)">+</button>
                    </div>
                </td>
                
                <td>
                    <div class="delivery-cell">
                        <div class="total-delivered">${totalDelivered} Units</div>
                        <div class="last-updated"><i class="fa-regular fa-clock"></i> Last: ${lastInfo}</div>
                        <button class="btn-log" onclick="openDeliveryModal(${realIndex})">View Log</button>
                    </div>
                </td>
                
                <td>
                    <button onclick="openDamageModal(${realIndex})" class="btn-icon" style="color: #ef4444; border: 1px solid #fee2e2; margin-right:5px;"><i class="fa-solid fa-triangle-exclamation"></i></button>
                    <button onclick="openEditModal(${realIndex})" class="btn-icon" style="color: #2563eb; margin-right: 5px;"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteItem(${realIndex})" class="btn-icon" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        }
        
        tableBody.innerHTML += rowHtml;
    });
}

window.updateDamageInfo = (index, field, value) => {
    inventory[index][field] = value;
    saveData();
};

window.openDamageModal = (index) => {
    const item = inventory[index];
    document.getElementById('damageIndex').value = index;
    document.getElementById('damageItemName').innerText = item.name;
    document.getElementById('damageQty').value = "";
    document.getElementById('damageFile').value = ""; 
    document.getElementById('dmgReturnId').value = ""; 
    document.getElementById('dmgMethod').value = "Fedex Pickup Return";
    document.getElementById('dmgStatus').value = "Pending";
    damageModal.style.display = 'block';
};

damageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = parseInt(document.getElementById('damageIndex').value);
    const qty = parseInt(document.getElementById('damageQty').value);
    const fileInput = document.getElementById('damageFile');
    const retId = document.getElementById('dmgReturnId').value;
    const retMethod = document.getElementById('dmgMethod').value;
    const retStatus = document.getElementById('dmgStatus').value;

    // REMOVED VALIDATION CHECK HERE TO ALLOW REPORTING ANY AMOUNT

    inventory[index].available -= qty;
    inventory[index].damaged = (inventory[index].damaged || 0) + qty;
    inventory[index].returnId = retId;
    inventory[index].returnMethod = retMethod;
    inventory[index].returnStatus = retStatus;

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            inventory[index].damagedImg = e.target.result; 
            saveData();
            closeAllModals();
            alert("Return reported & photo saved.");
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        saveData();
        closeAllModals();
        alert("Return reported.");
    }
});

window.toggleStar = (index) => { inventory[index].isStarred = !inventory[index].isStarred; saveData(); };
window.manualStockUpdate = (index, value) => { let newVal = parseInt(value); if (isNaN(newVal) || newVal < 0) newVal = 0; inventory[index].available = newVal; saveData(); };
window.updateAvailable = (index, change) => { inventory[index].available += change; if(inventory[index].available < 0) inventory[index].available = 0; saveData(); };
window.openDeliveryModal = (index) => {
    const item = inventory[index];
    deliveryItemName.innerText = `${item.name} (${item.sku})`;
    deliveryIndexInput.value = index;
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('logDate').value = now.toISOString().slice(0,16);
    document.getElementById('logQty').value = "";
    renderHistoryTable(item.deliveryLog || []);
    deliveryModal.style.display = 'block';
};
deliveryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = parseInt(deliveryIndexInput.value);
    const dateVal = document.getElementById('logDate').value;
    const qtyVal = parseInt(document.getElementById('logQty').value);
    if(!inventory[index].deliveryLog) inventory[index].deliveryLog = [];
    inventory[index].deliveryLog.push({ date: dateVal, qty: qtyVal });
    saveData();
    renderHistoryTable(inventory[index].deliveryLog); 
    document.getElementById('logQty').value = "";
});
function renderHistoryTable(logs) {
    historyList.innerHTML = '';
    const sortedLogs = [...logs].reverse();
    if(sortedLogs.length === 0) { historyList.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999;">No delivery history yet.</td></tr>'; return; }
    sortedLogs.forEach((log, logIndex) => {
        const realIndex = logs.length - 1 - logIndex;
        const d = new Date(log.date);
        const row = `<tr><td>${d.toLocaleDateString()}</td><td>${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td><td style="color:#ef4444; font-weight:bold;">${log.qty} Units</td><td><button onclick="deleteLog(${realIndex})" style="color:#94a3b8; border:none; background:none; cursor:pointer;">&times;</button></td></tr>`;
        historyList.innerHTML += row;
    });
}
window.exportHistory = () => {
    const index = parseInt(deliveryIndexInput.value);
    const item = inventory[index];
    let csvContent = "data:text/csv;charset=utf-8,Date,Time,Quantity Delivered\n";
    if(item.deliveryLog) { item.deliveryLog.forEach(log => { const d = new Date(log.date); csvContent += `${d.toLocaleDateString()},${d.toLocaleTimeString()},${log.qty}\n`; }); }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${item.name}_delivery_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
window.deleteLog = (logIndex) => { const itemIndex = parseInt(deliveryIndexInput.value); if(confirm('Delete this history entry?')) { inventory[itemIndex].deliveryLog.splice(logIndex, 1); saveData(); renderHistoryTable(inventory[itemIndex].deliveryLog); } };
addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editIndex = parseInt(editIndexInput.value);
    const newItem = {
        name: document.getElementById('prodName').value,
        sku: document.getElementById('prodSku').value,
        image: document.getElementById('prodImg').value,
        available: parseInt(document.getElementById('prodAvail').value),
        deliveryLog: [],
        damaged: 0, 
        damagedImg: "",
        returnId: "",
        returnMethod: "Fedex Pickup Return",
        returnStatus: "Pending"
    };
    if (editIndex > -1) {
        newItem.isStarred = inventory[editIndex].isStarred; 
        newItem.deliveryLog = inventory[editIndex].deliveryLog || []; 
        newItem.damaged = inventory[editIndex].damaged || 0;
        newItem.damagedImg = inventory[editIndex].damagedImg || "";
        newItem.returnId = inventory[editIndex].returnId || "";
        newItem.returnMethod = inventory[editIndex].returnMethod || "Fedex Pickup Return";
        newItem.returnStatus = inventory[editIndex].returnStatus || "Pending";
        inventory[editIndex] = newItem;
    } else {
        newItem.isStarred = false; 
        inventory.unshift(newItem);
    }
    saveData();
    closeAllModals();
});
window.openEditModal = (index) => {
    const item = inventory[index];
    document.getElementById('prodName').value = item.name;
    document.getElementById('prodSku').value = item.sku;
    document.getElementById('prodImg').value = item.image;
    document.getElementById('prodAvail').value = item.available;
    editIndexInput.value = index;
    document.getElementById('modalTitle').innerText = "Edit Product";
    document.getElementById('saveBtn').innerText = "Update Product";
    itemModal.style.display = "block";
};
window.deleteItem = (index) => { if(confirm('Delete this product?')) { inventory.splice(index, 1); saveData(); } };
window.closeAllModals = () => {
    itemModal.style.display = "none";
    deliveryModal.style.display = "none";
    damageModal.style.display = "none";
};
window.onclick = (e) => { if (e.target == itemModal || e.target == deliveryModal || e.target == damageModal) closeAllModals(); };
searchInput.addEventListener('keyup', (e) => { refreshView(); });
document.getElementById('addNewBtn').onclick = () => {
    addForm.reset(); editIndexInput.value = "-1";
    document.getElementById('imgPreview').style.display = "none"; 
    document.getElementById('modalTitle').innerText = "Add New Product";
    document.getElementById('saveBtn').innerText = "Save Product";
    itemModal.style.display = "block";
};
const SECRET_PIN = "1234"; 
window.checkPin = () => {
    const input = document.getElementById('pinInput').value;
    if (input === SECRET_PIN) { document.getElementById('loginOverlay').style.display = "none"; } 
    else { document.getElementById('loginError').style.display = "block"; document.getElementById('pinInput').value = ""; }
}
document.getElementById('pinInput').addEventListener('keypress', function (e) { if (e.key === 'Enter') { checkPin(); } });
window.autoFillImage = () => {
    const asin = document.getElementById('prodSku').value.trim();
    if (asin.length === 10) {
        const link = `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=${asin}&Format=_SL300_&ID=AsinImage&MarketPlace=US&ServiceVersion=20070822&WS=1`;
        document.getElementById('prodImg').value = link;
        document.getElementById('imgPreview').src = link;
        document.getElementById('imgPreview').style.display = "block";
    }
}