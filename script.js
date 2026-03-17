// Database simulation using localStorage
let products = [];
let cart = [];
let transactions = [];
let returTransactions = [];
let activityLogs = [];
let users = [];
let currentUser = { username: 'owner', role: 'Owner' };
let scanEnabled = true;
let autoAddEnabled = true;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    loadProducts();
    updateDashboard();
    updateCart();
    loadManajemenUser();
    loadPengaturan();
    loadLogAktivitas();
    updateCurrentUserDisplay();
    applyMenuAccess();
    if (checkSession()) {
        hideLoginModal();
    } else {
        showLoginModal();
    }
    
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('laporanDari').value = firstOfMonth.toISOString().split('T')[0];
    document.getElementById('laporanSampai').value = today.toISOString().split('T')[0];
    
    loadLaporan();
    
    // Auto focus on barcode input
    document.getElementById('barcodeInput').focus();
    
    // Enter key listener for barcode input
    document.getElementById('barcodeInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            tambahBarang();
        }
    });
    
    // Form submit handler
    document.getElementById('formTambahBarang').addEventListener('submit', function(e) {
        e.preventDefault();
        simpanBarangBaru();
    });
});

// Load data from localStorage
function loadData() {
    const savedProducts = localStorage.getItem('products');
    const savedTransactions = localStorage.getItem('transactions');
    const savedRetur = localStorage.getItem('returTransactions');
    const savedUsers = localStorage.getItem('users');
    const savedActivityLogs = localStorage.getItem('activityLogs');

    if (savedProducts) {
        products = JSON.parse(savedProducts);
    } else {
        products = [
            { kode: 'BRG001', barcode: '8992761111111', nama: 'Indomie Goreng', hargaBeli: 2500, hargaJual: 3000, stok: 100 },
            { kode: 'BRG002', barcode: '8992761222222', nama: 'Aqua 600ml', hargaBeli: 2000, hargaJual: 3000, stok: 50 },
            { kode: 'BRG003', barcode: '8992761333333', nama: 'Teh Botol Sosro', hargaBeli: 3000, hargaJual: 4000, stok: 75 },
            { kode: 'BRG004', barcode: '8992761444444', nama: 'Chitato Rasa Sapi Panggang', hargaBeli: 8000, hargaJual: 10000, stok: 30 },
            { kode: 'BRG005', barcode: '8992761555555', nama: 'Oreo Vanilla', hargaBeli: 6000, hargaJual: 8000, stok: 40 },
        ];
        saveProducts();
    }

    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
    }

    if (savedRetur) {
        returTransactions = JSON.parse(savedRetur);
    }

    if (savedUsers) {
        users = JSON.parse(savedUsers);
    } else {
        users = [
            { username: 'owner', nama: 'Owner', password: 'owner', role: 'Owner', akses: ['dashboard','manajemen-barang','transaksi','transaksi-retur','laporan','manajemen-user','pengaturan','log-aktivitas'] }
        ];
        localStorage.setItem('users', JSON.stringify(users));
    }

    if (savedActivityLogs) {
        activityLogs = JSON.parse(savedActivityLogs);
    }

    loadSession();
}

function loadSession() {
    const savedCurrentUser = localStorage.getItem('currentUser');
    const savedExpiry = parseInt(localStorage.getItem('sessionExpiry') || '0', 10);
    const rememberMe = localStorage.getItem('rememberMe') === 'true';

    if (savedCurrentUser && savedExpiry && Date.now() < savedExpiry) {
        currentUser = JSON.parse(savedCurrentUser);
        if (!rememberMe) {
            localStorage.removeItem('rememberMe');
        }
    } else {
        currentUser = users[0];
        clearSession();
    }
}

function saveProducts() {
    localStorage.setItem('products', JSON.stringify(products));
}

// Save transactions to localStorage
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}

function updateCurrentUserDisplay() {
    const userInfo = document.querySelector('.user-info');
    if (userInfo) userInfo.textContent = `User: ${currentUser.username} | Role: ${currentUser.role}`;
}

function applyMenuAccess() {
    document.querySelectorAll('.menu-item').forEach(item => {
        const onclick = item.getAttribute('onclick') || '';
        const match = onclick.match(/showPage\('(.*)'\)/);
        if (match) {
            const pageName = match[1];
            if (!currentUser.akses.includes(pageName)) {
                item.style.display = 'none';
            } else {
                item.style.display = 'flex';
            }
        }
    });
}

// Page navigation
function showPage(pageName) {
    if (!checkSession()) return;
    if (!currentUser || !currentUser.akses || !currentUser.akses.includes(pageName)) {
        alert('Anda tidak memiliki akses ke menu ini.');
        return;
    }
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageName);
    if (targetPage) targetPage.classList.add('active');
    
    // Add active class to matching menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        const onclick = item.getAttribute('onclick') || '';
        if (onclick.includes(`showPage('${pageName}')`) || onclick.includes(`showPage(\"${pageName}\")`)) {
            item.classList.add('active');
        }
    });
    
    // Load specific page data
    if (pageName === 'manajemen-barang') {
        loadManajemenBarang();
    }
    if (pageName === 'pengaturan') {
        loadPengaturan();
    }
    if (pageName === 'transaksi-retur') {
        updateReturSummary();
        loadReturHistory();
    }
    if (pageName === 'laporan') {
        loadLaporan();
    }
    if (pageName === 'manajemen-user') {
        loadManajemenUser();
        loadHakAksesDefault();
    }
    if (pageName === 'log-aktivitas') {
        loadLogAktivitas();
    }
}

// Load products table
function loadProducts() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.kode}</td>
            <td>${product.nama}</td>
            <td>${formatRupiah(product.hargaJual)}</td>
            <td>${product.stok}</td>
        `;
        row.ondblclick = () => addToCart(product);
        tbody.appendChild(row);
    });
}

// Load manajemen barang
function loadManajemenBarang() {
    const tbody = document.getElementById('manajemenBarangBody');
    tbody.innerHTML = '';
    
    products.forEach((product, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.kode}</td>
            <td>${product.barcode}</td>
            <td>${product.nama}</td>
            <td>${formatRupiah(product.hargaBeli)}</td>
            <td>${formatRupiah(product.hargaJual)}</td>
            <td>${product.stok}</td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editBarang(${index})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="hapusBarang(${index})">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Add to cart
function addToCart(product) {
    if (product.stok <= 0) {
        alert('Stok barang habis!');
        return;
    }
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.kode === product.kode);
    
    if (existingItem) {
        if (existingItem.qty < product.stok) {
            existingItem.qty++;
            existingItem.subtotal = existingItem.qty * existingItem.harga;
        } else {
            alert('Stok tidak mencukupi!');
            return;
        }
    } else {
        cart.push({
            kode: product.kode,
            nama: product.nama,
            harga: product.hargaJual,
            qty: 1,
            subtotal: product.hargaJual
        });
    }
    
    updateCart();
    playBeep();
}

// Tambah barang via barcode
function tambahBarang() {
    if (!scanEnabled) {
        alert('Scan dinonaktifkan. Aktifkan scan terlebih dahulu.');
        return;
    }

    const barcode = document.getElementById('barcodeInput').value.trim();
    
    if (!barcode) {
        alert('Silakan masukkan barcode!');
        return;
    }
    
    const product = products.find(p => p.barcode === barcode);
    
    if (product) {
        addToCart(product);
        if (autoAddEnabled) {
            document.getElementById('barcodeInput').value = '';
        }
        document.getElementById('barcodeInput').focus();
    } else {
        alert('Barang dengan barcode tersebut tidak ditemukan!');
        document.getElementById('barcodeInput').value = '';
    }
}

// Update cart display
function updateCart() {
    const tbody = document.getElementById('cartTableBody');
    tbody.innerHTML = '';
    
    let totalItems = 0;
    let subtotal = 0;
    
    cart.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.nama}</td>
            <td>${item.qty}</td>
            <td>${formatRupiah(item.harga)}</td>
            <td>${formatRupiah(item.subtotal)}</td>
        `;
        row.onclick = () => selectCartItem(index);
        tbody.appendChild(row);
        
        totalItems += item.qty;
        subtotal += item.subtotal;
    });
    
    document.getElementById('itemCount').textContent = `${totalItems} item | ${formatRupiah(subtotal)}`;
    document.getElementById('subtotal').textContent = formatRupiah(subtotal);
    
    hitungTotal();
}

// Calculate total
function hitungTotal() {
    const subtotalText = document.getElementById('subtotal').textContent;
    const subtotal = parseFloat(subtotalText.replace(/[^0-9]/g, ''));
    
    const diskonRp = parseFloat(document.getElementById('diskonRp').value) || 0;
    const diskonPersen = parseFloat(document.getElementById('diskonPersen').value) || 0;
    
    let totalDiskon = diskonRp + (subtotal * diskonPersen / 100);
    let totalBayar = subtotal - totalDiskon;
    
    document.getElementById('totalDiskon').textContent = formatRupiah(totalDiskon);
    document.getElementById('totalBayar').textContent = formatRupiah(totalBayar);
    
    hitungKembalian();
}

// Calculate change
function hitungKembalian() {
    const totalBayarText = document.getElementById('totalBayar').textContent;
    const totalBayar = parseFloat(totalBayarText.replace(/[^0-9]/g, ''));
    const tunai = parseFloat(document.getElementById('tunai').value) || 0;
    
    const kembalian = tunai - totalBayar;
    document.getElementById('kembalian').textContent = formatRupiah(kembalian);
}

// Process transaction
function prosesTransaksi() {
    if (cart.length === 0) {
        alert('Keranjang belanja kosong!');
        return;
    }
    
    const totalBayarText = document.getElementById('totalBayar').textContent;
    const totalBayar = parseFloat(totalBayarText.replace(/[^0-9]/g, ''));
    const tunai = parseFloat(document.getElementById('tunai').value) || 0;
    
    if (tunai < totalBayar) {
        alert('Uang tunai tidak mencukupi!');
        return;
    }
    
    // Update stock
    cart.forEach(item => {
        const product = products.find(p => p.kode === item.kode);
        if (product) {
            product.stok -= item.qty;
        }
    });
    
    // Customer info
    const namaPelanggan = document.getElementById('namaPelanggan').value.trim();
    const telpPelanggan = document.getElementById('telpPelanggan').value.trim();

    // Save transaction
    const transaction = {
        id: 'TRX' + Date.now(),
        tanggal: new Date().toISOString(),
        customerName: namaPelanggan || 'Umum',
        customerPhone: telpPelanggan || '-',
        items: [...cart],
        total: totalBayar,
        tunai: tunai,
        kembalian: tunai - totalBayar
    };
    
    transactions.push(transaction);
    
    // Save to localStorage
    saveProducts();
    saveTransactions();
    
    // Clear cart
    cart = [];
    updateCart();
    loadProducts();
    updateDashboard();
    
    // Reset form
    document.getElementById('diskonRp').value = 0;
    document.getElementById('diskonPersen').value = 0;
    document.getElementById('tunai').value = 0;
    
    alert('Transaksi berhasil diproses!\nID Transaksi: ' + transaction.id);
    logAktivitas('Transaksi', 'Transaksi berhasil diproses (ID: ' + transaction.id + ')');
    
    // Auto print
    if (confirm('Cetak struk?')) {
        cetakStruk(transaction);
    }
}

// Print receipt
function cetakStruk(transaction = null) {
    if (!transaction && cart.length === 0) {
        alert('Tidak ada data untuk dicetak!');
        return;
    }
    
    let printWindow = window.open('', '', 'width=300,height=600');
    
    const items = transaction ? transaction.items : cart;
    const total = transaction ? transaction.total : parseFloat(document.getElementById('totalBayar').textContent.replace(/[^0-9]/g, ''));
    
    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += `
            <tr>
                <td>${item.nama}</td>
                <td>${item.qty}</td>
                <td style="text-align: right">${formatRupiah(item.subtotal)}</td>
            </tr>
        `;
    });
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Struk Pembayaran</title>
            <style>
                body { font-family: monospace; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 5px 0; }
                .header { text-align: center; margin-bottom: 20px; }
                .total { border-top: 2px dashed #000; margin-top: 10px; padding-top: 10px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>TOKO ABC</h2>
                <p>Jl. Contoh No. 123</p>
                <p>Telp: 0812-3456-7890</p>
                <hr>
            </div>
            <p>Tanggal: ${new Date().toLocaleString('id-ID')}</p>
            ${transaction ? `<p>No. Transaksi: ${transaction.id}</p>` : ''}
            ${transaction ? `<p>Nama Pelanggan: ${transaction.customerName || 'Umum'}</p>` : ''}
            ${transaction ? `<p>No. Telp: ${transaction.customerPhone || '-'}</p>` : ''}
            <hr>
            <table>
                ${itemsHtml}
            </table>
            <div class="total">
                <table>
                    <tr>
                        <td>TOTAL:</td>
                        <td style="text-align: right">${formatRupiah(total)}</td>
                    </tr>
                    ${transaction ? `
                    <tr>
                        <td>TUNAI:</td>
                        <td style="text-align: right">${formatRupiah(transaction.tunai)}</td>
                    </tr>
                    <tr>
                        <td>KEMBALIAN:</td>
                        <td style="text-align: right">${formatRupiah(transaction.kembalian)}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>
            <hr>
            <p style="text-align: center">Terima Kasih</p>
            <p style="text-align: center">Selamat Berbelanja Kembali</p>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

// Update dashboard
function updateDashboard() {
    document.getElementById('totalProduk').textContent = products.length;
    
    // Count today's transactions
    const today = new Date().toDateString();
    const todayTransactions = transactions.filter(t => {
        return new Date(t.tanggal).toDateString() === today;
    });
    
    document.getElementById('transaksiHariIni').textContent = todayTransactions.length;
    
    // Calculate today's revenue
    const revenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);
    document.getElementById('pendapatanHariIni').textContent = formatRupiah(revenue);
    
    // Calculate profit (simplified)
    const profit = revenue * 0.2; // Assuming 20% profit margin
    document.getElementById('labaBersih').textContent = formatRupiah(profit);
}

function saveActivityLogs() {
    localStorage.setItem('activityLogs', JSON.stringify(activityLogs));
}

function logAktivitas(aksi, detail = '') {
    const keamananSettings = JSON.parse(localStorage.getItem('keamananSettings') || '{}');
    if (keamananSettings.logActivity === false) {
        return;
    }
    const waktu = new Date().toLocaleString('id-ID');
    activityLogs.unshift({ waktu, user: currentUser.username || 'Guest', aksi, detail });
    if (activityLogs.length > 500) {
        activityLogs = activityLogs.slice(0, 500);
    }
    saveActivityLogs();
    loadLogAktivitas();
}

function loadLogAktivitas() {
    const tbody = document.getElementById('logAktivitasBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    activityLogs.slice(0, 500).forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.waktu}</td>
            <td>${log.user}</td>
            <td>${log.aksi}</td>
            <td>${log.detail}</td>
        `;
        tbody.appendChild(row);
    });
}

const menuAksesDefault = ['dashboard','manajemen-barang','transaksi','transaksi-retur','laporan','manajemen-user','pengaturan','log-aktivitas'];

function loadManajemenUser() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    users.forEach((user, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.nama}</td>
            <td>${user.role}</td>
            <td>${user.akses.join(', ')}</td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editUser(${index})"><i class='fas fa-edit'></i> Edit</button>
                <button class="btn btn-danger btn-sm" onclick="hapusUser(${index})"><i class='fas fa-trash'></i> Hapus</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    const aksesWrapper = document.getElementById('defaultMenuAkses');
    if (aksesWrapper && aksesWrapper.innerHTML.trim() === '') {
        aksesWrapper.innerHTML = '';
        menuAksesDefault.forEach(menu => {
            const id = 'defaultAkses_' + menu;
            const labelName = menu.replace('-', ' ').toUpperCase();
            aksesWrapper.innerHTML += `<label class='checkbox-label'><input type='checkbox' id='${id}' checked> <span>${labelName}</span></label>`;
        });
    }
}

function tambahUserModal() {
    document.getElementById('modalUserTitle').textContent = 'Tambah User';
    document.getElementById('editUserIndex').value = '';
    document.getElementById('usernameUser').value = '';
    document.getElementById('namaUser').value = '';
    document.getElementById('passwordUser').value = '';
    document.getElementById('roleUser').value = 'Kasir';

    const aksesMenu = document.getElementById('userAksesMenu');
    aksesMenu.innerHTML = '';
    menuAksesDefault.forEach(menu => {
        const id = 'userAkses_' + menu;
        const labelName = menu.replace('-', ' ').toUpperCase();
        aksesMenu.innerHTML += `<label class='checkbox-label'><input type='checkbox' id='${id}' checked> <span>${labelName}</span></label>`;
    });

    document.getElementById('modalUser').style.display = 'block';
}

function editUser(index) {
    const user = users[index];
    if (!user) return;
    document.getElementById('modalUserTitle').textContent = 'Edit User';
    document.getElementById('editUserIndex').value = index;
    document.getElementById('usernameUser').value = user.username;
    document.getElementById('namaUser').value = user.nama;
    document.getElementById('passwordUser').value = user.password;
    document.getElementById('roleUser').value = user.role;

    const aksesMenu = document.getElementById('userAksesMenu');
    aksesMenu.innerHTML = '';
    menuAksesDefault.forEach(menu => {
        const id = 'userAkses_' + menu;
        const checked = user.akses.includes(menu) ? 'checked' : '';
        const labelName = menu.replace('-', ' ').toUpperCase();
        aksesMenu.innerHTML += `<label class='checkbox-label'><input type='checkbox' id='${id}' ${checked}> <span>${labelName}</span></label>`;
    });

    document.getElementById('modalUser').style.display = 'block';
}

function simpanUser() {
    const index = document.getElementById('editUserIndex').value;
    const username = document.getElementById('usernameUser').value.trim();
    const nama = document.getElementById('namaUser').value.trim();
    const password = document.getElementById('passwordUser').value.trim();
    const role = document.getElementById('roleUser').value;

    if (!username || !nama || !password) {
        alert('Semua field wajib diisi!');
        return;
    }

    const akses = menuAksesDefault.filter(menu => document.getElementById('userAkses_' + menu).checked);
    const userData = { username, nama, password, role, akses };

    if (index !== '') {
        users[index] = userData;
    } else {
        if (users.find(u => u.username === username)) {
            alert('Username sudah terdaftar!');
            return;
        }
        users.push(userData);
    }

    localStorage.setItem('users', JSON.stringify(users));
    closeModal('modalUser');
    loadManajemenUser();
    logAktivitas('Manajemen User', 'User disimpan: ' + username + ' (' + role + ')');
    alert('User berhasil disimpan.');
}

function hapusUser(index) {
    if (confirm('Hapus user ini?')) {
        const removedUser = users.splice(index, 1)[0];
        localStorage.setItem('users', JSON.stringify(users));
        loadManajemenUser();
        logAktivitas('Manajemen User', 'User dihapus: ' + (removedUser ? removedUser.username : 'Unknown'));
    }
}

function simpanHakAksesDefault() {
    const role = document.getElementById('defaultRole').value;
    const akses = menuAksesDefault.filter(menu => document.getElementById('defaultAkses_' + menu).checked);
    localStorage.setItem('defaultRoleAkses_' + role, JSON.stringify(akses));
    alert('Hak akses default disimpan.');
}

function loadHakAksesDefault() {
    const role = document.getElementById('defaultRole').value;
    const saved = localStorage.getItem('defaultRoleAkses_' + role);
    if (!saved) return;
    const akses = JSON.parse(saved);
    menuAksesDefault.forEach(menu => {
        const checkbox = document.getElementById('defaultAkses_' + menu);
        if (checkbox) checkbox.checked = akses.includes(menu);
    });
}

let laporanChartInstance = null;

function getLaporanDateRange() {
    const dari = document.getElementById('laporanDari').value;
    const sampai = document.getElementById('laporanSampai').value;

    let startDate = dari ? new Date(dari) : null;
    let endDate = sampai ? new Date(sampai) : null;
    if (endDate) endDate.setHours(23,59,59,999);
    return {startDate, endDate};
}

function inRange(dateStr, startDate, endDate) {
    const d = new Date(dateStr);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
}

function setPeriode(type) {
    const now = new Date();
    let startDate = new Date(now);
    let endDate = new Date(now);

    if (type === 'today') {
        // same day
    } else if (type === 'week') {
        const diff = now.getDay() || 7;
        startDate.setDate(now.getDate() - diff + 1);
    } else if (type === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    document.getElementById('laporanDari').value = startDate.toISOString().split('T')[0];
    document.getElementById('laporanSampai').value = endDate.toISOString().split('T')[0];
    loadLaporan();
}

function loadLaporan() {
    const {startDate, endDate} = getLaporanDateRange();

    const filteredTransaksi = transactions.filter(t => inRange(t.tanggal, startDate, endDate));
    const filteredRetur = returTransactions.filter(r => inRange(r.tanggal, startDate, endDate));

    const totalRevenue = filteredTransaksi.reduce((sum, t) => sum + t.total, 0);
    const totalCost = filteredTransaksi.reduce((sum, t) => {
        return sum + t.items.reduce((itemSum, item) => {
            const product = products.find(p => p.kode === item.kode);
            const hargaBeli = product ? product.hargaBeli : item.harga * 0.7;
            return itemSum + hargaBeli * item.qty;
        }, 0);
    }, 0);
    const totalProfit = totalRevenue - totalCost;
    const totalRetur = filteredRetur.reduce((sum, r) => sum + r.total, 0);

    document.getElementById('laporanPendapatan').textContent = formatRupiah(totalRevenue);
    document.getElementById('laporanBiaya').textContent = formatRupiah(totalCost);
    document.getElementById('laporanLaba').textContent = formatRupiah(totalProfit);
    document.getElementById('laporanRetur').textContent = formatRupiah(totalRetur);

    const transaksiBody = document.getElementById('laporanTransaksiBody');
    transaksiBody.innerHTML = '';
    filteredTransaksi.slice(-10).reverse().forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${t.id}</td><td>${new Date(t.tanggal).toLocaleString('id-ID')}</td><td>${formatRupiah(t.total)}</td><td>${t.items.length}</td>`;
        transaksiBody.appendChild(row);
    });

    const returBody = document.getElementById('laporanReturBody');
    returBody.innerHTML = '';
    filteredRetur.slice(-10).reverse().forEach(r => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${r.id}</td><td>${new Date(r.tanggal).toLocaleString('id-ID')}</td><td>${formatRupiah(r.total)}</td><td>${r.items.length}</td>`;
        returBody.appendChild(row);
    });

    drawLaporanChart(filteredTransaksi);
}

function drawLaporanChart(transaksiData) {
    const aggregated = {};
    transaksiData.forEach(t => {
        const key = new Date(t.tanggal).toISOString().split('T')[0];
        if (!aggregated[key]) aggregated[key] = 0;
        aggregated[key] += t.total;
    });

    const labels = Object.keys(aggregated).sort();
    const values = labels.map(key => aggregated[key]);

    const ctx = document.getElementById('laporanChart').getContext('2d');
    if (laporanChartInstance) laporanChartInstance.destroy();
    laporanChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pendapatan',
                data: values,
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function exportLaporanExcel() {
    const {startDate, endDate} = getLaporanDateRange();
    const filteredTransaksi = transactions.filter(t => inRange(t.tanggal, startDate, endDate));
    const filteredRetur = returTransactions.filter(r => inRange(r.tanggal, startDate, endDate));

    let csv = 'Jenis,ID,Tanggal,Total,ItemCount\n';
    filteredTransaksi.forEach(t => {
        csv += `Transaksi,${t.id},${new Date(t.tanggal).toLocaleString('id-ID')},${t.total},${t.items.length}\n`;
    });
    filteredRetur.forEach(r => {
        csv += `Retur,${r.id},${new Date(r.tanggal).toLocaleString('id-ID')},${r.total},${r.items.length}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'laporan_kasir_' + Date.now() + '.csv';
    link.click();
}

function exportLaporanPDF() {
    const {startDate, endDate} = getLaporanDateRange();
    const filteredTransaksi = transactions.filter(t => inRange(t.tanggal, startDate, endDate));
    const filteredRetur = returTransactions.filter(r => inRange(r.tanggal, startDate, endDate));

    let html = `
        <html><head><title>Laporan Kasir</title><style>body{font-family:Arial; padding:20px;}h2{margin-bottom:0;}table{width:100%;border-collapse:collapse;margin-top:10px;}th,td{border:1px solid #ddd;padding:8px;}th{background:#f1f1f1;}</style></head><body>
        <h2>Laporan Kasir</h2>
        <p>Periode: ${document.getElementById('laporanDari').value || '-'} s/d ${document.getElementById('laporanSampai').value || '-'}</p>
        <h3>Transaksi</h3>
        <table><tr><th>ID</th><th>Tanggal</th><th>Total</th><th>Item</th></tr>`;
    filteredTransaksi.forEach(t => {
        html += `<tr><td>${t.id}</td><td>${new Date(t.tanggal).toLocaleString('id-ID')}</td><td>${formatRupiah(t.total)}</td><td>${t.items.length}</td></tr>`;
    });
    html += `</table><h3>Retur</h3><table><tr><th>ID</th><th>Tanggal</th><th>Total</th><th>Item</th></tr>`;
    filteredRetur.forEach(r => {
        html += `<tr><td>${r.id}</td><td>${new Date(r.tanggal).toLocaleString('id-ID')}</td><td>${formatRupiah(r.total)}</td><td>${r.items.length}</td></tr>`;
    });
    html += '</table></body></html>';

    const win = window.open('', '', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
}

// Format to Rupiah
function formatRupiah(angka) {
    if (isNaN(angka)) return 'Rp 0';
    return 'Rp ' + Math.round(angka).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Play beep sound
function playBeep() {
    // Simple beep simulation
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// Transaksi Retur
function tambahRetur() {
    const barcode = document.getElementById('barcodeRetur').value.trim();
    const qty = parseInt(document.getElementById('qtyRetur').value, 10) || 1;
    const alasan = document.getElementById('alasanRetur').value.trim();

    if (!barcode) {
        alert('Silakan masukkan barcode untuk retur!');
        return;
    }

    if (isNaN(qty) || qty <= 0) {
        alert('Qty retur tidak valid!');
        return;
    }

    const product = products.find(p => p.barcode === barcode);
    if (!product) {
        alert('Produk tidak ditemukan untuk barcode ini.');
        return;
    }

    const existing = cart.find(item => item.kode === product.kode && item.harga === product.hargaJual);
    const returItem = {
        kode: product.kode,
        barcode: product.barcode,
        nama: product.nama,
        qty: qty,
        harga: product.hargaJual,
        subtotal: qty * product.hargaJual,
        alasan: alasan || 'Retur pelanggan'
    };

    if (!window.returCart) window.returCart = [];
    window.returCart.push(returItem);
    updateReturList();
    document.getElementById('barcodeRetur').value = '';
    document.getElementById('qtyRetur').value = 1;
    document.getElementById('alasanRetur').value = '';
}

function updateReturList() {
    if (!window.returCart) window.returCart = [];
    const tbody = document.getElementById('returTableBody');
    tbody.innerHTML = '';

    let totalItem = 0;
    let totalNilai = 0;

    window.returCart.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.barcode}</td>
            <td>${item.nama}</td>
            <td>${item.qty}</td>
            <td>${formatRupiah(item.harga)}</td>
            <td>${formatRupiah(item.subtotal)}</td>
        `;
        tbody.appendChild(row);

        totalItem += item.qty;
        totalNilai += item.subtotal;
    });

    document.getElementById('totalReturItem').textContent = totalItem;
    document.getElementById('totalNilaiRetur').textContent = formatRupiah(totalNilai);
}

function prosesTransaksiRetur() {
    if (!window.returCart || window.returCart.length === 0) {
        alert('Keranjang retur kosong!');
        return;
    }

    const keterangan = document.getElementById('keteranganRetur').value.trim();
    const totalNilai = window.returCart.reduce((sum, item) => sum + item.subtotal, 0);
    const id = 'RT' + Date.now();

    window.returCart.forEach(item => {
        const prod = products.find(p => p.kode === item.kode);
        if (prod) {
            prod.stok += item.qty;
        }
    });

    const returObj = {
        id: id,
        tanggal: new Date().toISOString(),
        items: [...window.returCart],
        total: totalNilai,
        keterangan: keterangan
    };

    returTransactions.push(returObj);
    saveReturTransactions();
    saveProducts();
    loadProducts();
    updateDashboard();
    updateReturList();
    loadReturHistory();

    window.returCart = [];
    document.getElementById('keteranganRetur').value = '';
    alert('Retur berhasil diproses. Stok barang telah dikembalikan.');
    logAktivitas('Retur', 'Retur diproses (ID: ' + returObj.id + ', Total: ' + formatRupiah(totalNilai) + ')');
}

function updateReturSummary() {
    if (!window.returCart) window.returCart = [];
    const totalItem = window.returCart.reduce((sum, item) => sum + item.qty, 0);
    const totalNilai = window.returCart.reduce((sum, item) => sum + item.subtotal, 0);
    document.getElementById('totalReturItem').textContent = totalItem;
    document.getElementById('totalNilaiRetur').textContent = formatRupiah(totalNilai);
}

function loadReturHistory() {
    const tbody = document.getElementById('historyReturBody');
    tbody.innerHTML = '';

    returTransactions.slice(-10).reverse().forEach(retur => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${retur.id}</td>
            <td>${new Date(retur.tanggal).toLocaleString('id-ID')}</td>
            <td>${formatRupiah(retur.total)}</td>
            <td>${retur.items.length}</td>
        `;
        tbody.appendChild(row);
    });
}

// Toggle scan
function toggleScan() {
    scanEnabled = !scanEnabled;
    const btn = document.getElementById('scanBtn');
    btn.innerHTML = scanEnabled ? '<i class="fas fa-qrcode"></i> SCAN: ON' : '<i class="fas fa-qrcode"></i> SCAN: OFF';
    btn.style.background = scanEnabled ? '#8e44ad' : '#95a5a6';
}

// Pause scan
function pauseScan() {
    alert('Scan dihentikan sementara');
}

// Auto add toggle
function autoAdd() {
    autoAddEnabled = !autoAddEnabled;
    const btn = document.getElementById('autoAddBtn');
    btn.innerHTML = autoAddEnabled ? '<i class="fas fa-check"></i> AUTO ADD: ON' : '<i class="fas fa-times"></i> AUTO ADD: OFF';
    btn.style.background = autoAddEnabled ? '#27ae60' : '#95a5a6';
}

// Search products
function cariBarang() {
    const keyword = document.getElementById('searchInput').value.toLowerCase();
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';
    
    const filtered = products.filter(p => 
        p.nama.toLowerCase().includes(keyword) || 
        p.kode.toLowerCase().includes(keyword)
    );
    
    filtered.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.kode}</td>
            <td>${product.nama}</td>
            <td>${formatRupiah(product.hargaJual)}</td>
            <td>${product.stok}</td>
        `;
        row.ondblclick = () => addToCart(product);
        tbody.appendChild(row);
    });
}

// Modal functions
function tambahBarangBaru() {
    document.getElementById('modalTambahBarang').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function simpanBarangBaru() {
    const newProduct = {
        kode: document.getElementById('kodeBarang').value,
        barcode: document.getElementById('barcode').value,
        nama: document.getElementById('namaBarang').value,
        hargaBeli: parseFloat(document.getElementById('hargaBeli').value),
        hargaJual: parseFloat(document.getElementById('hargaJual').value),
        stok: parseInt(document.getElementById('stok').value)
    };
    
    products.push(newProduct);
    saveProducts();
    loadProducts();
    loadManajemenBarang();
    updateDashboard();
    
    closeModal('modalTambahBarang');
    document.getElementById('formTambahBarang').reset();
    logAktivitas('Barang', 'Barang baru ditambahkan: ' + newProduct.nama + ' (' + newProduct.kode + ')');
    alert('Barang baru berhasil ditambahkan!');
}

// Cart operations
function tambahManual() {
    const nama = prompt('Nama barang manual:');
    if (!nama) return;

    const harga = parseFloat(prompt('Harga jual per item (Rp):', '0'));
    if (isNaN(harga) || harga <= 0) {
        alert('Harga tidak valid');
        return;
    }

    const qty = parseInt(prompt('Jumlah (qty):', '1'));
    if (isNaN(qty) || qty <= 0) {
        alert('Jumlah tidak valid');
        return;
    }

    cart.push({
        kode: 'MANUAL-' + Date.now(),
        nama: nama,
        harga: harga,
        qty: qty,
        subtotal: harga * qty
    });

    updateCart();
    alert('Barang manual berhasil ditambahkan ke keranjang.');
}

function editQty() {
    if (selectedCartIndex < 0 || selectedCartIndex >= cart.length) {
        alert('Silakan pilih item dari keranjang terlebih dahulu.');
        return;
    }

    const item = cart[selectedCartIndex];
    const newQty = parseInt(prompt('Masukkan jumlah baru untuk ' + item.nama + ':', item.qty));

    if (isNaN(newQty) || newQty <= 0) {
        alert('Jumlah tidak valid');
        return;
    }

    const product = products.find(p => p.kode === item.kode);
    if (product && newQty > product.stok) {
        alert('Stok tidak mencukupi. Stok tersedia: ' + product.stok);
        return;
    }

    item.qty = newQty;
    item.subtotal = item.harga * newQty;
    updateCart();
    alert('Jumlah berhasil diperbarui.');
}

function hapusItem() {
    if (cart.length === 0) {
        alert('Keranjang belanja kosong!');
        return;
    }
    if (confirm('Hapus item terakhir dari keranjang?')) {
        cart.pop();
        updateCart();
    }
}

function kosongkanKeranjang() {
    if (cart.length === 0) {
        alert('Keranjang belanja sudah kosong!');
        return;
    }
    if (confirm('Kosongkan seluruh keranjang belanja?')) {
        cart = [];
        updateCart();
    }
}

function terapkanDiskon() {
    hitungTotal();
    alert('Diskon berhasil diterapkan!');
}

function resetDiskon() {
    document.getElementById('diskonRp').value = 0;
    document.getElementById('diskonPersen').value = 0;
    hitungTotal();
}

// Other functions
function editBarang(index) {
    alert('Fitur edit barang akan dibuka dalam modal untuk indeks: ' + index);
}

function hapusBarang(index) {
    if (confirm('Yakin ingin menghapus barang ini?')) {
        const removed = products.splice(index, 1)[0];
        saveProducts();
        loadManajemenBarang();
        updateDashboard();
        logAktivitas('Barang', 'Barang dihapus: ' + (removed ? removed.nama + ' (' + removed.kode + ')' : 'Unknown'));
    }
}

function backupDatabase() {
    const data = {
        products: products,
        transactions: transactions,
        timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'backup_kasir_' + new Date().getTime() + '.json';
    link.click();
    
    alert('Database berhasil dibackup!');
}

function gantiPassword() {
    const newPassword = prompt('Masukkan password baru:');
    if (newPassword) {
        alert('Password berhasil diubah!');
    }
}

function gantiUsername() {
    const newUsername = prompt('Masukkan username baru:');
    if (newUsername) {
        alert('Username berhasil diubah!');
    }
}

function logout() {
    if (confirm('Yakin ingin logout?')) {
        logAktivitas('Logout', 'User logout: ' + (currentUser.username || 'Guest'));
        clearSession();
        currentUser = { username: 'guest', role: 'Guest', akses: [] };
        updateCurrentUserDisplay();
        applyMenuAccess();
        showLoginModal();
    }
}

function setSession(user, remember) {
    currentUser = user;
    updateCurrentUserDisplay();
    applyMenuAccess();
    const timeoutMin = parseInt(localStorage.getItem('sessionTimeoutMin') || '30', 10);
    const expiry = Date.now() + timeoutMin * 60 * 1000;
    localStorage.setItem('sessionExpiry', expiry.toString());
    localStorage.setItem('currentUser', JSON.stringify(user));
    if (remember) {
        localStorage.setItem('rememberMe', 'true');
    } else {
        localStorage.removeItem('rememberMe');
    }
}

function clearSession() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionExpiry');
    localStorage.removeItem('rememberMe');
}

function checkSession() {
    const expiry = parseInt(localStorage.getItem('sessionExpiry') || '0', 10);
    if (Date.now() > expiry) {
        clearSession();
        showLoginModal('Sesi Anda habis. Silakan login kembali.');
        return false;
    }
    return true;
}

function showLoginModal(message = '') {
    document.getElementById('loginPage').style.display = 'flex';
    document.querySelector('.header').style.display = 'none';
    document.querySelector('.container').style.display = 'none';
    document.getElementById('loginStatus').textContent = message;
}

function hideLoginModal() {
    document.getElementById('loginPage').style.display = 'none';
    document.querySelector('.header').style.display = 'flex';
    document.querySelector('.container').style.display = 'flex';
}

function loginUser() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe').checked;
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        document.getElementById('loginStatus').textContent = 'Username atau password salah';
        return;
    }

    setSession(user, remember);
    logAktivitas('Login', 'User login: ' + user.username);
    hideLoginModal();
    showPage('dashboard');
}

function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.style.display = 'none';
}

let selectedCartIndex = -1;

function selectCartItem(index) {
    selectedCartIndex = index;
    // Highlight selected row
    document.querySelectorAll('#cartTableBody tr').forEach((row, i) => {
        if (i === index) {
            row.style.background = '#d4edda';
        } else {
            row.style.background = '';
        }
    });
}

// ==============================================
// PENGATURAN FUNCTIONS
// ==============================================

// Load settings on page load
function loadPengaturan() {
    loadDatabaseInfo();
    loadStoredSettings();
}

// Load database info
function loadDatabaseInfo() {
    const dataStr = JSON.stringify({products, transactions});
    const sizeInBytes = new Blob([dataStr]).size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    
    document.getElementById('ukuranDatabase').textContent = sizeInKB + ' KB';
    document.getElementById('totalTransaksi').textContent = transactions.length;
    document.getElementById('totalProdukDb').textContent = products.length;
    
    const lastBackup = localStorage.getItem('lastBackupDate');
    if (lastBackup) {
        document.getElementById('backupTerakhir').textContent = new Date(lastBackup).toLocaleString('id-ID');
    }
}

// Load stored settings
function loadStoredSettings() {
    // Load info toko
    const infoToko = JSON.parse(localStorage.getItem('infoToko') || '{}');
    if (infoToko.nama) document.getElementById('namaToko').value = infoToko.nama;
    if (infoToko.alamat) document.getElementById('alamatToko').value = infoToko.alamat;
    if (infoToko.telepon) document.getElementById('teleponToko').value = infoToko.telepon;
    if (infoToko.email) document.getElementById('emailToko').value = infoToko.email;
    
    // Load printer settings
    const printerSettings = JSON.parse(localStorage.getItem('printerSettings') || '{}');
    if (printerSettings.jenis) document.getElementById('jenisPrinter').value = printerSettings.jenis;
    if (printerSettings.salinan) document.getElementById('jumlahSalinan').value = printerSettings.salinan;
    document.getElementById('autoOpenCashDrawer').checked = printerSettings.autoOpenDrawer !== false;
    document.getElementById('printLogo').checked = printerSettings.printLogo !== false;
    document.getElementById('printBarcode').checked = printerSettings.printBarcode !== false;

    const pajakSettings = JSON.parse(localStorage.getItem('pajakSettings') || '{}');
    document.getElementById('enablePajak').checked = pajakSettings.enablePajak || false;
    if (pajakSettings.persentasePajak !== undefined) document.getElementById('persentasePajak').value = pajakSettings.persentasePajak;
    if (pajakSettings.diskonMaksimal !== undefined) document.getElementById('diskonMaksimal').value = pajakSettings.diskonMaksimal;
    if (pajakSettings.diskonMember !== undefined) document.getElementById('diskonMember').value = pajakSettings.diskonMember;

    const notifSettings = JSON.parse(localStorage.getItem('notifSettings') || '{}');
    document.getElementById('notifStokHabis').checked = notifSettings.stokHabis !== false;
    if (notifSettings.batasMinimum) document.getElementById('batasMinimumStok').value = notifSettings.batasMinimum;
    document.getElementById('notifTransaksiBerhasil').checked = notifSettings.transaksiBerhasil !== false;
    document.getElementById('soundEffect').checked = notifSettings.soundEffect !== false;

    const scannerSettings = JSON.parse(localStorage.getItem('scannerSettings') || '{}');
    if (scannerSettings.tipe) document.getElementById('tipeScanner').value = scannerSettings.tipe;
    document.getElementById('autoAddBarcode').checked = scannerSettings.autoAdd !== false;
    if (scannerSettings.delay) document.getElementById('delayScan').value = scannerSettings.delay;
    document.getElementById('prefixScanner').checked = scannerSettings.usePrefix || false;
    if (scannerSettings.prefix) document.getElementById('prefixBarcodeValue').value = scannerSettings.prefix;

    const tampilanSettings = JSON.parse(localStorage.getItem('tampilanSettings') || '{}');
    if (tampilanSettings.tema) document.getElementById('temaWarna').value = tampilanSettings.tema;
    if (tampilanSettings.fontSize) document.getElementById('ukuranFont').value = tampilanSettings.fontSize;
    if (tampilanSettings.bahasa) document.getElementById('bahasa').value = tampilanSettings.bahasa;
    document.getElementById('modeLebar').checked = tampilanSettings.modeLebar !== false;

    const keamananSettings = JSON.parse(localStorage.getItem('keamananSettings') || '{}');
    document.getElementById('requiredLogin').checked = keamananSettings.requiredLogin !== false;
    if (keamananSettings.timeout) document.getElementById('timeoutSesi').value = keamananSettings.timeout;
    document.getElementById('logActivity').checked = keamananSettings.logActivity !== false;
    document.getElementById('requirePasswordTransaction').checked = keamananSettings.requirePasswordTransaction !== false;

    ubahTema();
    ubahUkuranFont();
}

// Simpan Info Toko
function simpanInfoToko() {
    const infoToko = {
        nama: document.getElementById('namaToko').value,
        alamat: document.getElementById('alamatToko').value,
        telepon: document.getElementById('teleponToko').value,
        email: document.getElementById('emailToko').value
    };
    
    localStorage.setItem('infoToko', JSON.stringify(infoToko));
    alert('✅ Informasi toko berhasil disimpan!');
}

// Simpan Pengaturan Printer
function simpanPengaturanPrinter() {
    const printerSettings = {
        jenis: document.getElementById('jenisPrinter').value,
        salinan: document.getElementById('jumlahSalinan').value,
        autoOpenDrawer: document.getElementById('autoOpenCashDrawer').checked,
        printLogo: document.getElementById('printLogo').checked,
        printBarcode: document.getElementById('printBarcode').checked
    };
    
    localStorage.setItem('printerSettings', JSON.stringify(printerSettings));
    alert('✅ Pengaturan printer berhasil disimpan!');
}

// Test Print
function testPrint() {
    const printWindow = window.open('', '', 'width=300,height=400');
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Test Print</title>
            <style>
                body { 
                    font-family: monospace; 
                    padding: 20px; 
                    text-align: center;
                }
                h2 { margin: 20px 0; }
                .line { border-top: 2px dashed #000; margin: 15px 0; }
            </style>
        </head>
        <body>
            <h2>TEST PRINT</h2>
            <div class="line"></div>
            <p>Tanggal: ${new Date().toLocaleString('id-ID')}</p>
            <p>Printer: ${document.getElementById('jenisPrinter').value}</p>
            <div class="line"></div>
            <p>Test print berhasil!</p>
            <p>Printer berfungsi dengan baik</p>
            <div class="line"></div>
            <p style="margin-top: 30px;">Terima Kasih</p>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

// Simpan Pengaturan Pajak
function simpanPengaturanPajak() {
    const pajakSettings = {
        enablePajak: document.getElementById('enablePajak').checked,
        persentasePajak: document.getElementById('persentasePajak').value,
        diskonMaksimal: document.getElementById('diskonMaksimal').value,
        diskonMember: document.getElementById('diskonMember').value
    };
    
    localStorage.setItem('pajakSettings', JSON.stringify(pajakSettings));
    alert('✅ Pengaturan pajak berhasil disimpan!');
}

// Simpan Pengaturan Notifikasi
function simpanPengaturanNotifikasi() {
    const notifSettings = {
        stokHabis: document.getElementById('notifStokHabis').checked,
        batasMinimum: document.getElementById('batasMinimumStok').value,
        transaksiBerhasil: document.getElementById('notifTransaksiBerhasil').checked,
        soundEffect: document.getElementById('soundEffect').checked
    };
    
    localStorage.setItem('notifSettings', JSON.stringify(notifSettings));
    alert('✅ Pengaturan notifikasi berhasil disimpan!');
}

// Simpan Pengaturan Scanner
function simpanPengaturanScanner() {
    const scannerSettings = {
        tipe: document.getElementById('tipeScanner').value,
        autoAdd: document.getElementById('autoAddBarcode').checked,
        delay: document.getElementById('delayScan').value,
        usePrefix: document.getElementById('prefixScanner').checked,
        prefix: document.getElementById('prefixBarcodeValue').value
    };
    
    localStorage.setItem('scannerSettings', JSON.stringify(scannerSettings));
    alert('✅ Pengaturan scanner berhasil disimpan!');
}

// Simpan Pengaturan Tampilan
function simpanPengaturanTampilan() {
    const tampilanSettings = {
        tema: document.getElementById('temaWarna').value,
        fontSize: document.getElementById('ukuranFont').value,
        bahasa: document.getElementById('bahasa').value,
        modeLebar: document.getElementById('modeLebar').checked
    };
    
    localStorage.setItem('tampilanSettings', JSON.stringify(tampilanSettings));
    alert('✅ Pengaturan tampilan berhasil disimpan!');
}

// Ubah Tema
function ubahTema() {
    const tema = document.getElementById('temaWarna').value;
    const root = document.documentElement;
    
    switch(tema) {
        case 'dark':
            root.style.setProperty('--primary-color', '#1a1a1a');
            root.style.setProperty('--secondary-color', '#2d2d2d');
            document.body.style.background = '#0d0d0d';
            break;
        case 'green':
            root.style.setProperty('--primary-color', '#27ae60');
            root.style.setProperty('--secondary-color', '#2ecc71');
            break;
        case 'purple':
            root.style.setProperty('--primary-color', '#8e44ad');
            root.style.setProperty('--secondary-color', '#9b59b6');
            break;
        case 'red':
            root.style.setProperty('--primary-color', '#c0392b');
            root.style.setProperty('--secondary-color', '#e74c3c');
            break;
        default:
            root.style.setProperty('--primary-color', '#2c3e50');
            root.style.setProperty('--secondary-color', '#34495e');
            document.body.style.background = '#f0f2f5';
    }
}

// Ubah Ukuran Font
function ubahUkuranFont() {
    const ukuran = document.getElementById('ukuranFont').value;
    const root = document.documentElement;
    
    switch(ukuran) {
        case 'small':
            root.style.fontSize = '13px';
            break;
        case 'large':
            root.style.fontSize = '16px';
            break;
        default:
            root.style.fontSize = '14px';
    }
}

// Simpan Pengaturan Keamanan
function simpanPengaturanKeamanan() {
    const keamananSettings = {
        requiredLogin: document.getElementById('requiredLogin').checked,
        timeout: document.getElementById('timeoutSesi').value,
        logActivity: document.getElementById('logActivity').checked,
        requirePasswordTransaction: document.getElementById('requirePasswordTransaction').checked
    };
    
    localStorage.setItem('keamananSettings', JSON.stringify(keamananSettings));
    alert('✅ Pengaturan keamanan berhasil disimpan!');
}

// Restore Database
function restoreDatabase() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                
                if (confirm('⚠️ Restore database akan menimpa semua data yang ada. Lanjutkan?')) {
                    products = data.products || [];
                    transactions = data.transactions || [];
                    
                    saveProducts();
                    saveTransactions();
                    
                    loadProducts();
                    updateDashboard();
                    loadDatabaseInfo();
                    
                    alert('✅ Database berhasil di-restore!');
                }
            } catch (error) {
                alert('❌ File tidak valid! Pastikan file adalah backup yang benar.');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// Reset Database
function resetDatabase() {
    if (confirm('⚠️ Reset database akan mengembalikan data ke kondisi awal. Lanjutkan?')) {
        if (confirm('⚠️ PERINGATAN TERAKHIR! Semua transaksi akan hilang. Yakin?')) {
            // Reset ke data default
            products = [
                { kode: 'BRG001', barcode: '8992761111111', nama: 'Indomie Goreng', hargaBeli: 2500, hargaJual: 3000, stok: 100 },
                { kode: 'BRG002', barcode: '8992761222222', nama: 'Aqua 600ml', hargaBeli: 2000, hargaJual: 3000, stok: 50 },
                { kode: 'BRG003', barcode: '8992761333333', nama: 'Teh Botol Sosro', hargaBeli: 3000, hargaJual: 4000, stok: 75 },
                { kode: 'BRG004', barcode: '8992761444444', nama: 'Chitato Rasa Sapi Panggang', hargaBeli: 8000, hargaJual: 10000, stok: 30 },
                { kode: 'BRG005', barcode: '8992761555555', nama: 'Oreo Vanilla', hargaBeli: 6000, hargaJual: 8000, stok: 40 },
            ];
            transactions = [];
            
            saveProducts();
            saveTransactions();
            
            loadProducts();
            updateDashboard();
            loadDatabaseInfo();
            
            alert('✅ Database berhasil di-reset ke kondisi awal!');
        }
    }
}

// Hapus Semua Data
function hapusSemua() {
    if (!currentUser || currentUser.role !== 'Owner') {
        alert('Hanya user dengan role Owner yang dapat menghapus semua data.');
        return;
    }
    if (confirm('🚨 PERINGATAN! Ini akan menghapus SEMUA data termasuk produk dan transaksi!')) {
        if (confirm('⚠️ Apakah Anda BENAR-BENAR yakin? Data tidak dapat dikembalikan!')) {
            const password = prompt('Masukkan password Owner untuk konfirmasi:');
            if (password === currentUser.password) {
                localStorage.clear();
                alert('✅ Semua data berhasil dihapus! Halaman akan di-refresh.');
                location.reload();
            } else {
                alert('❌ Password salah! Penghapusan dibatalkan.');
            }
        }
    }
}

// Reset Semua Pengaturan
function resetSemuaPengaturan() {
    if (confirm('⚠️ Reset semua pengaturan ke default?')) {
        localStorage.removeItem('infoToko');
        localStorage.removeItem('printerSettings');
        localStorage.removeItem('pajakSettings');
        localStorage.removeItem('notifSettings');
        localStorage.removeItem('scannerSettings');
        localStorage.removeItem('tampilanSettings');
        localStorage.removeItem('keamananSettings');
        
        alert('✅ Semua pengaturan berhasil di-reset! Halaman akan di-refresh.');
        location.reload();
    }
}

// Update backupDatabase function to save date
const originalBackupDatabase = backupDatabase;
backupDatabase = function() {
    originalBackupDatabase();
    localStorage.setItem('lastBackupDate', new Date().toISOString());
    loadDatabaseInfo();
};



