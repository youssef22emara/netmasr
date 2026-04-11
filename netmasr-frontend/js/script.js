// Configurable API variable directed to Render Backend Instance
const API_URL = 'https://your-backend-url.onrender.com/api/complaints';

document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle ---
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => navLinks.classList.toggle('active'));
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => navLinks.classList.remove('active'));
        });
    }

    // --- Live Aggregation Fetching ---
    const loadDashboardStats = async () => {
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            if(data && data.success) {
                const totalText = document.getElementById('statTotal');
                const refusedText = document.getElementById('statRefused');
                if(totalText) totalText.innerText = data.stats.total;
                if(refusedText) refusedText.innerText = data.stats.refusedCount;
            }
        } catch (error) {
            console.error('Error fetching live stats (Ensure Render backend is running):', error);
        }
    };
    loadDashboardStats();

    // --- Form Registration Action ---
    const complaintForm = document.getElementById('complaintForm');
    const submitError = document.getElementById('submitError');
    if (complaintForm) {
        complaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'جاري الإرسال...';
            btn.disabled = true;
            submitError.style.display = 'none';

            const payload = {
                fullName: document.getElementById('fullName').value,
                phoneNumber: document.getElementById('phoneNumber').value,
                governorate: document.getElementById('governorate').value,
                company: document.getElementById('company').value,
                type: document.getElementById('type').value,
                description: document.getElementById('description').value,
                refusedNumber: document.getElementById('refusedNumber').checked
            };

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();

                if (result.success) {
                    complaintForm.style.display = 'none';
                    document.getElementById('resultBox').style.display = 'block';
                    document.getElementById('trackingIdDisplay').innerText = result.trackingId;
                    loadDashboardStats();
                } else {
                    submitError.innerText = result.error || 'حدث خطأ في النظام.';
                    submitError.style.display = 'block';
                }
            } catch (error) {
                submitError.innerText = 'خطأ في الاتصال بالخادم. تأكد من عمل (Render Backend).';
                submitError.style.display = 'block';
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    // --- Tracking Retrieval Status ---
    const trackBtn = document.getElementById('trackBtn');
    if (trackBtn) {
        trackBtn.addEventListener('click', async () => {
            const id = document.getElementById('trackInput').value.trim();
            const errorMsg = document.getElementById('errorMsg');
            const trackerInfo = document.getElementById('trackerInfo');
            
            errorMsg.style.display = 'none';
            trackerInfo.classList.remove('active');

            if (!id || id.length < 10) return;

            const btn = document.getElementById('trackBtn');
            const orgText = btn.innerText;
            btn.innerText = 'بحث...';

            try {
                const response = await fetch(`${API_URL}/${id}`);
                const result = await response.json();

                if (result && result.success && result.data) {
                    const complaint = result.data;
                    document.getElementById('trackIdDisplayBox').innerText = complaint.trackingId;
                    document.getElementById('companyDisplay').innerText = complaint.company;
                    document.getElementById('typeDisplay').innerText = complaint.type;
                    document.getElementById('dateDisplay').innerText = new Date(complaint.createdAt).toLocaleDateString('ar-EG');
                    
                    const badge = document.getElementById('statusBadge');
                    let arabicStatus = complaint.status;
                    let cssClass = 'status-Pending';
                    
                    if (complaint.status === 'Pending') { arabicStatus = 'قيد الانتظار'; cssClass = 'status-Pending'; }
                    if (complaint.status === 'Under Review') { arabicStatus = 'قيد المراجعة'; cssClass = 'status-UnderReview'; }
                    if (complaint.status === 'Escalated') { arabicStatus = 'تم التصعيد'; cssClass = 'status-Escalated'; }
                    if (complaint.status === 'Completed') { arabicStatus = 'تم الحل'; cssClass = 'status-Completed'; }

                    badge.innerText = arabicStatus;
                    badge.className = `status-badge ${cssClass}`;

                    trackerInfo.classList.add('active');
                } else {
                    errorMsg.style.display = 'block';
                }
            } catch (error) {
                errorMsg.innerText = 'فشل الاتصال بالخادم (تأكد من تشغيل Render Backend)';
                errorMsg.style.display = 'block';
            } finally {
                btn.innerText = orgText;
            }
        });
    }
});
