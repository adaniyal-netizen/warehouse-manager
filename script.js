// --- 1. FIREBASE CONFIGURATION ---
// ******************************************************
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
// ******************************************************

// --- 2. INITIALIZE FIREBASE ---
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const dbRef = db.ref('inventory');

let inventory = [];

// --- 3. THE LISTENER ---
dbRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data === null) {
        inventory = [];
    } else {
        inventory = data;
    }
    
    // Migration check
    inventory.forEach(item => {
        if (!item.deliveryLog) item.deliveryLog = [];
    });
    
    renderTable(inventory);
});

// --- SELECT ELEMENTS ---
const tableBody = document.querySelector('#inventoryTable tbody');
const searchInput = document.getElementById('searchInput');
const itemModal = document.getElementById('itemModal');
const deliveryModal = document.getElementById('deliveryModal');
const addForm = document.getElementById('addForm');
const deliveryForm = document.getElementById('deliveryForm');
const editIndexInput = document.getElementById('editIndex');
const deliveryIndexInput = document.getElementById('deliveryIndex');
const deliveryItemName = document.getElementById('deliveryItemName');
const historyList = document.getElementById('historyList');

// --- HELPER: SAVE TO CLOUD ---
function saveData() {
    dbRef.set(inventory).catch((error) => {
        alert("Error saving data: " + error.message);
    });
}

// --- RENDER TABLE ---
function renderTable(data) {
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No items found. Click "+ Add New Item".</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        const totalDelivered = item.deliveryLog ? item.deliveryLog.reduce((sum, log) => sum + log.qty, 0) : 0;
        
        let lastInfo = "No history";
        if (item.deliveryLog && item.deliveryLog.length > 0) {
            const lastLog = item.deliveryLog[item.deliveryLog.length - 1];
            const d = new Date(lastLog.date);
            lastInfo = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
        }

        const isLow = item.available < 10;
        const statusClass = isLow ? 'badge-low' : 'badge-ok';
        const statusText = isLow ? 'Low Stock' : 'In Stock';

        const row = `
            <tr>
                <td><img src="${item.image}" class="product-img" alt="img" onerror="this.src='https://via.placeholder.com/60?text=No+Img'"></td>
                <td>
                    <div style="font-weight:bold; font-size:1.05rem;">${item.name}</div>
                    <div style="color:#64748b; font-size:0.85rem;">SKU: ${item.sku}</div>
                </td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="stock-control">
                        <button class="btn-icon" onclick="updateAvailable(${index}, -1)" style="width:24px; height:24px;">-</button>
                        <input type="number" class="stock-input" value="${item.available}" onchange="manualStockUpdate(${index}, this.value)">
                        <button class="btn-icon" onclick="updateAvailable(${index}, 1)" style="width:24px; height:24px;">+</button>
                    </div>
                </td>
                <td>
                    <div class="delivery-cell">
                        <div class="total-delivered">${totalDelivered} Units</div>
                        <div class="last-updated"><i class="fa-regular fa-clock"></i> Last: ${lastInfo}</div>
                        <button class="btn-log" onclick="openDeliveryModal(${index})">View Log / Add Delivery</button>
                    </div>
                </td>
                <td>
                    <button onclick="openEditModal(${index})" class="btn-icon" style="color: #2563eb; margin-right: 5px;"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteItem(${index})" class="btn-icon" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// --- LOGIC FUNCTIONS ---
window.manualStockUpdate = (index, value) => {
    let newVal = parseInt(value);
    if (isNaN(newVal) || newVal < 0) newVal = 0;
    inventory[index].available = newVal;
    saveData();
};

window.updateAvailable = (index, change) => {
    inventory[index].available += change;
    if(inventory[index].available < 0) inventory[index].available = 0;
    saveData();
};

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
    if(sortedLogs.length === 0) {
        historyList.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999;">No delivery history yet.</td></tr>';
        return;
    }
    sortedLogs.forEach((log, logIndex) => {
        const realIndex = logs.length - 1 - logIndex;
        const d = new Date(log.date);
        const row = `
            <tr>
                <td>${d.toLocaleDateString()}</td>
                <td>${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td style="color:#ef4444; font-weight:bold;">${log.qty} Units</td>
                <td><button onclick="deleteLog(${realIndex})" style="color:#94a3b8; border:none; background:none; cursor:pointer;">&times;</button></td>
            </tr>`;
        historyList.innerHTML += row;
    });
}

window.exportHistory = () => {
    const index = parseInt(deliveryIndexInput.value);
    const item = inventory[index];
    let csvContent = "data:text/csv;charset=utf-8,Date,Time,Quantity Delivered\n";
    if(item.deliveryLog) {
        item.deliveryLog.forEach(log => {
            const d = new Date(log.date);
            csvContent += `${d.toLocaleDateString()},${d.toLocaleTimeString()},${log.qty}\n`;
        });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${item.name}_delivery_history.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.deleteLog = (logIndex) => {
    const itemIndex = parseInt(deliveryIndexInput.value);
    if(confirm('Delete this history entry?')) {
        inventory[itemIndex].deliveryLog.splice(logIndex, 1);
        saveData();
        renderHistoryTable(inventory[itemIndex].deliveryLog);
    }
};

addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editIndex = parseInt(editIndexInput.value);
    const newItem = {
        name: document.getElementById('prodName').value,
        sku: document.getElementById('prodSku').value,
        image: document.getElementById('prodImg').value,
        available: parseInt(document.getElementById('prodAvail').value),
        deliveryLog: [] 
    };

    if (editIndex > -1) {
        newItem.deliveryLog = inventory[editIndex].deliveryLog || []; 
        inventory[editIndex] = newItem;
    } else {
        inventory.push(newItem);
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

window.deleteItem = (index) => {
    if(confirm('Delete this product and all its history?')) {
        inventory.splice(index, 1);
        saveData();
    }
};

window.closeAllModals = () => {
    itemModal.style.display = "none";
    deliveryModal.style.display = "none";
};

window.onclick = (e) => {
    if (e.target == itemModal || e.target == deliveryModal) closeAllModals();
};

searchInput.addEventListener('keyup', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = inventory.filter(item => 
        item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term)
    );
    renderTable(filtered);
});

document.getElementById('addNewBtn').onclick = () => {
    addForm.reset();
    editIndexInput.value = "-1";
    document.getElementById('modalTitle').innerText = "Add New Product";
    document.getElementById('saveBtn').innerText = "Save Product";
    itemModal.style.display = "block";
};

// --- 4. NEW: LOGIN SYSTEM ---
const SECRET_PIN = "3647"; // <--- CHANGE PASSWORD HERE

window.checkPin = () => {
    const input = document.getElementById('pinInput').value;
    const errorMsg = document.getElementById('loginError');
    const overlay = document.getElementById('loginOverlay');
    
    if (input === SECRET_PIN) {
        overlay.style.display = "none"; 
    } else {
        errorMsg.style.display = "block";
        document.getElementById('pinInput').value = ""; 
    }
}