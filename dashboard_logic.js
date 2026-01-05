import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBEo-hTWKMww8C1XAG6Hh0wxNVHvk_sTzM",
    authDomain: "tanzimbrothers.firebaseapp.com",
    projectId: "tanzimbrothers",
    storageBucket: "tanzimbrothers.firebasestorage.app",
    messagingSenderId: "14689849610",
    appId: "1:14689849610:web:8e24f0402fbd1791586af3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let allCustomers = []; // লোকাল ডাটা রাখার জন্য

function convertToEnglish(str) {
    const bNums = {'০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'};
    return String(str).replace(/[০-৯]/g, m => bNums[m]);
}

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else loadData();
});

document.getElementById('logout-btn').onclick = () => signOut(auth);

// ১. নতুন কাস্টমার সেভ
document.getElementById('add-customer-btn').onclick = async () => {
    const name = document.getElementById('c-name').value.trim();
    const shop = document.getElementById('c-shop').value.trim();
    const cid = document.getElementById('c-id').value.trim();
    const phone = convertToEnglish(document.getElementById('c-phone').value.trim());

    if(!name || !cid) return alert("নাম এবং আইডি দিন!");
    const q = query(collection(db, "customers"), where("customId", "==", cid));
    const checkId = await getDocs(q);
    if(!checkId.empty) return alert("এই আইডিটি ব্যবহৃত হয়েছে!");

    await addDoc(collection(db, "customers"), { name, shop, customId: cid, phone, totalDue: 0, date: new Date() });
    alert("সেভ হয়েছে!");
};

// ২. কাস্টমার সার্চ ও প্রোফাইল এডিট (ইতিহাস সহ)
let currentEditDocId = null; 

document.getElementById('search-btn').onclick = async () => {
    const input = document.getElementById('search-id').value.trim().toLowerCase();
    const englishInput = convertToEnglish(input);

    if(!input) return alert("সার্চ করার জন্য কিছু লিখুন");

    const snap = await getDocs(collection(db, "customers"));
    let target = null;

    snap.forEach((d) => {
        const data = d.data();
        const matchID = data.customId && data.customId.toLowerCase() === input;
        const matchName = data.name && data.name.toLowerCase().includes(input);
        const matchPhone = data.phone && (data.phone.includes(input) || data.phone.includes(englishInput));

        if (matchID || matchName || matchPhone) {
            target = { id: d.id, ...data };
        }
    });

    if(!target) return alert("কাস্টমার পাওয়া যায়নি");

    currentEditDocId = target.id;
    document.getElementById('search-output').style.display = 'block';
    document.getElementById('update-action-area').style.display = 'block';
    
    // প্রোফাইল এডিট ডিজাইন
    document.getElementById('customer-profile-info').innerHTML = `
        <div class="profile-grid">
            <div class="edit-group"><label>দোকানের নাম:</label><input type="text" id="e-name" value="${target.name}"></div>
            <div class="edit-group"><label>কাস্টমারের নাম:</label><input type="text" id="e-shop" value="${target.shop || ''}"></div>
            <div class="edit-group"><label>মোবাইল:</label><input type="text" id="e-phone" value="${target.phone || ''}"></div>
        </div>
        <div class="status-info-bar">
            <span >🆔 আইডি: <span style = "font-weight:bold;"> ${target.customId}</span></span> | <span>💰 বকেয়া: <span style="color:red;font-weight:bold;">${target.totalDue} ৳</span></span>
        </div>`;

    // ইতিহাস লোড (এটি ঠিক করা হয়েছে)
    const tq = query(collection(db, "transactions"), where("cId", "==", target.customId));
    const tSnap = await getDocs(tq);
    let hHtml = "";
    const sortedHistory = tSnap.docs.map(d => d.data()).sort((a,b) => b.ts - a.ts);
    
    sortedHistory.forEach(d => {
        hHtml += `
            <div class="history-item">
                <div>
                    <span class="${d.type==='due'?'badge-due':'badge-paid'}">${d.type==='due'?'বাকি (+)':'জমা (-)'}</span>
                    <br><small>${d.time}</small>
                </div>
                <strong>${d.amount} ৳</strong>
            </div>`;
    });
    document.getElementById('history-list').innerHTML = hHtml || "<p style='padding:10px;'>কোনো লেনদেনের ইতিহাস নেই</p>";
    document.getElementById('search-output').scrollIntoView({ behavior: 'smooth' });
};

// ৩. তথ্য আপডেট ফাংশন
document.getElementById('update-info-btn').onclick = async () => {
    if(!currentEditDocId) return;
    const name = document.getElementById('e-name').value.trim();
    const shop = document.getElementById('e-shop').value.trim();
    const phone = convertToEnglish(document.getElementById('e-phone').value.trim());

    if(!name) return alert("নাম দিতেই হবে");

    await updateDoc(doc(db, "customers", currentEditDocId), { name, shop, phone });
    alert("তথ্য আপডেট হয়েছে!");
};

// ৪. ডাটা লোড ও লাইভ ফিল্টার
function loadData() {
    onSnapshot(collection(db, "customers"), (snap) => {
        allCustomers = [];
        let totalDueCount = 0;
        snap.forEach(d => {
            const data = d.data();
            allCustomers.push({ id: d.id, ...data });
            totalDueCount += (data.totalDue || 0);
        });
        renderTable(allCustomers);
        document.getElementById('stat-total-cust').innerText = snap.size;
        document.getElementById('stat-total-due').innerText = totalDueCount + " ৳";
    });
}

function renderTable(dataArray) {
    let rows = "";
    dataArray.forEach(data => {
        rows += `<tr><td>${data.customId}</td><td>${data.name}<br><small>${data.shop}</small></td><td style="color:red; font-weight:bold;">${data.totalDue} ৳</td><td><button onclick="delCust('${data.id}')" style="background:#fee2e2; color:red; border:none; padding:5px; border-radius:4px; cursor:pointer;">মুছুন</button></td></tr>`;
    });
    document.getElementById('customer-table-body').innerHTML = rows;
}

// আইডি লিখলে টেবিল ফিল্টার হবে
document.getElementById('t-id').addEventListener('input', (e) => {
    const searchVal = e.target.value.trim().toLowerCase();
    const filtered = allCustomers.filter(c => 
        c.customId.toLowerCase().includes(searchVal) || 
        c.name.toLowerCase().includes(searchVal)
    );
    renderTable(filtered);
});

// ৫. লেনদেন আপডেট সেভ
document.getElementById('add-trans-btn').onclick = async () => {
    const cid = document.getElementById('t-id').value.trim();
    const amt = Number(convertToEnglish(document.getElementById('t-amount').value.trim()));
    const type = document.querySelector('input[name="trans-type"]:checked').value;

    if(!cid || isNaN(amt) || amt <= 0) return alert("সঠিক তথ্য দিন");
    const q = query(collection(db, "customers"), where("customId", "==", cid));
    const qs = await getDocs(q);
    
    if(!qs.empty) {
        const cDoc = qs.docs[0];
        const newDue = type === 'due' ? (cDoc.data().totalDue + amt) : (cDoc.data().totalDue - amt);
        await updateDoc(doc(db, "customers", cDoc.id), { totalDue: newDue });
        await addDoc(collection(db, "transactions"), { 
            cId: cid, 
            amount: amt, 
            type, 
            time: new Date().toLocaleString('bn-BD'), 
            ts: new Date() 
        });
        alert("লেনদেন সফল হয়েছে!");
        document.getElementById('t-id').value = "";
        document.getElementById('t-amount').value = "";
        renderTable(allCustomers);
    } else { alert("আইডিটি খুঁজে পাওয়া যায়নি!"); }
};

window.delCust = (id) => { if(confirm("মুছবেন?")) deleteDoc(doc(db, "customers", id)); };
