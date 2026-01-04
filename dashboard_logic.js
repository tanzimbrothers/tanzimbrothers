import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteDoc, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase Configuration
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

// ১. লগইন চেক
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
    else loadData();
});

document.getElementById('logout-btn').onclick = () => signOut(auth);

// ২. টেবিল ফিল্টার লজিক (লেনদেন আইডি ফিল্ডে লিখলে টেবিল আপডেট হবে)
document.getElementById('t-id').addEventListener('input', (e) => {
    const searchValue = e.target.value.toLowerCase();
    const tableRows = document.querySelectorAll('#customer-table-body tr');

    tableRows.forEach(row => {
        const customerId = row.querySelector('td:first-child').innerText.toLowerCase();
        // যদি আইডি মিলে যায় তবে দেখাবে, না মিললে হাইড করে দিবে
        if (customerId.includes(searchValue)) {
            row.style.display = "";
            row.style.backgroundColor = searchValue !== "" ? "#fff7ed" : ""; // হাইলাইট করার জন্য
        } else {
            row.style.display = "none";
        }
    });
});

// ৩. নতুন কাস্টমার সেভ
document.getElementById('add-customer-btn').onclick = async () => {
    const name = document.getElementById('c-name').value.trim();
    const shop = document.getElementById('c-shop').value.trim();
    const cid = document.getElementById('c-id').value.trim();
    const phone = document.getElementById('c-phone').value.trim();

    if(!name || !cid) return alert("নাম এবং আইডি অবশ্যই দিন!");

    const q = query(collection(db, "customers"), where("customId", "==", cid));
    const checkId = await getDocs(q);
    if(!checkId.empty) return alert("এই আইডিটি ইতিমধ্যে ব্যবহৃত হয়েছে!");

    try {
        await addDoc(collection(db, "customers"), {
            name, shop, customId: cid, phone, totalDue: 0, date: new Date()
        });
        alert("কাস্টমার সেভ হয়েছে!");
        ['c-name', 'c-shop', 'c-id', 'c-phone'].forEach(id => document.getElementById(id).value = '');
    } catch (e) { alert("Error: " + e.message); }
};

// ৪. সার্চ লজিক (প্রোফাইল + ইতিহাস)
// --- ৩. অ্যাডভান্সড সার্চ লজিক (ID, Name, Shop, or Phone) ---
document.getElementById('search-btn').onclick = async () => {
    const input = document.getElementById('search-id').value.trim().toLowerCase();
    if(!input) return alert("সার্চ করার জন্য কিছু লিখুন (নাম/আইডি/দোকান/ফোন)");

    // ১. প্রথমে সব কাস্টমার ডাটা নেওয়া (সার্চ করার জন্য)
    const querySnapshot = await getDocs(collection(db, "customers"));
    let targetCustomer = null;

    // ২. লুপ চালিয়ে ম্যাচিং কাস্টমার খুঁজে বের করা
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (
            data.customId.toLowerCase() === input || 
            data.name.toLowerCase().includes(input) || 
            (data.shop && data.shop.toLowerCase().includes(input)) || 
            (data.phone && data.phone.includes(input))
        ) {
            targetCustomer = { id: doc.id, ...data };
        }
    });

    if(!targetCustomer) return alert("এই তথ্য দিয়ে কোনো কাস্টমার পাওয়া যায়নি!");

    // ৩. প্রোফাইল UI আপডেট
    const sid = targetCustomer.customId; // হিস্ট্রি খোঁজার জন্য আইডিটি নিয়ে রাখা
    document.getElementById('search-output').style.display = 'block';
    document.getElementById('customer-profile-info').innerHTML = `
        <div><strong>Customer Name:</strong> ${targetCustomer.name}</div>
        <div><strong>Dokaner Name:</strong> ${targetCustomer.shop || 'N/A'}</div>
        <div><strong>Customer ID:</strong> ${targetCustomer.customId}</div>
        <div><strong>Mobile:</strong> ${targetCustomer.phone || 'N/A'}</div>
        <div style="grid-column: 1 / -1; margin-top:10px;">
            <strong>Current Due:</strong> <span style="color:red; font-weight:bold; font-size:1.2rem;">${targetCustomer.totalDue} ৳</span>
        </div>
    `;

    // ৪. ওই কাস্টমারের লেনদেন ইতিহাস (Transactions) খুঁজে বের করা
    try {
        const tq = query(collection(db, "transactions"), where("cId", "==", sid));
        const transSnap = await getDocs(tq);
        
        let historyHtml = "";
        if(transSnap.empty) {
            historyHtml = "<p style='color:gray; text-align:center; padding:10px;'>এখনো কোনো লেনদেনের ইতিহাস নেই।</p>";
        } else {
            const docs = transSnap.docs.map(d => d.data()).sort((a, b) => b.ts - a.ts);
            docs.forEach(d => {
                const badge = d.type === 'due' ? 'badge-due' : 'badge-paid';
                const label = d.type === 'due' ? 'মাল দিলাম (+)' : 'টাকা পেলাম (-)';
                historyHtml += `
                    <div class="history-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                        <div>
                            <span class="${badge}">${label}</span><br>
                            <small style="color:gray;">${d.time}</small>
                        </div>
                        <div style="font-weight:bold;">${d.amount} ৳</div>
                    </div>`;
            });
        }
        document.getElementById('history-list').innerHTML = historyHtml;
    } catch (e) { 
        console.error("History Error:", e);
        document.getElementById('history-list').innerHTML = "ইতিহাস লোড করতে সমস্যা হয়েছে।";
    }
};

// ৫. কাস্টমার লিস্ট লোড করা
function loadData() {
    onSnapshot(collection(db, "customers"), (snap) => {
        let rows = ""; let tDue = 0;
        snap.forEach(d => {
            const data = d.data();
            tDue += data.totalDue;
            rows += `
                <tr>
                    <td style="padding:12px;"><b>${data.customId}</b></td>
                    <td style="padding:12px;">${data.name}<br><small>${data.shop}</small></td>
                    <td style="padding:12px; color:red; font-weight:bold;">${data.totalDue} ৳</td>
                    <td style="padding:12px;">
                        <button onclick="delCust('${d.id}')" style="background:#fee2e2; color:#ef4444; border:none; padding:5px 8px; border-radius:4px; cursor:pointer;">মুছুন</button>
                    </td>
                </tr>`;
        });
        document.getElementById('customer-table-body').innerHTML = rows;
        document.getElementById('stat-total-cust').innerText = snap.size;
        document.getElementById('stat-total-due').innerText = tDue + " ৳";
    });
}

// ৬. লেনদেন আপডেট
document.getElementById('add-trans-btn').onclick = async () => {
    const cid = document.getElementById('t-id').value.trim();
    const amt = Number(document.getElementById('t-amount').value);
    const type = document.querySelector('input[name="trans-type"]:checked').value;

    if(!cid || !amt) return alert("আইডি এবং টাকা দিন");

    const q = query(collection(db, "customers"), where("customId", "==", cid));
    const qs = await getDocs(q);
    
    if(!qs.empty) {
        const cDoc = qs.docs[0];
        const newDue = type === 'due' ? cDoc.data().totalDue + amt : cDoc.data().totalDue - amt;
        await updateDoc(doc(db, "customers", cDoc.id), { totalDue: newDue });
        await addDoc(collection(db, "transactions"), { 
            cId: cid, amount: amt, type, 
            time: new Date().toLocaleString('bn-BD'), ts: new Date() 
        });
        alert("হিসাব আপডেট সফল!");
        document.getElementById('t-amount').value = '';
        document.getElementById('t-id').value = '';
        // আপডেট শেষ হলে টেবিল রিসেট
        loadData();
    } else { alert("ভুল আইডি!"); }
};

window.delCust = (id) => { if(confirm("মুছতে চান?")) deleteDoc(doc(db, "customers", id)); };