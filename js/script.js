document.addEventListener('DOMContentLoaded', () => {

    const API_BASE = 'https://netmasrbackend-production.up.railway.app/api/complaints';
    let companyChartInstance = null;
    let categoryChartInstance = null;

    // Governorate Codes mapping (Standard Egyptian prefixes)
    const governorateCodes = {
        'Cairo': '02', 'Giza': '02', 'Alexandria': '03', 
        'Dakahlia': '050', 'Sharkia': '055', 'Qalyubia': '013', 
        'Gharbia': '040', 'Beheira': '045', 'Kafr El Sheikh': '047', 
        'Damietta': '057', 'Port Said': '066', 'Ismailia': '064', 
        'Suez': '062', 'Red Sea': '065', 'North Sinai': '068', 
        'South Sinai': '069', 'Luxor': '095', 'Qena': '096', 
        'Aswan': '097', 'Sohag': '093', 'Assiut': '088', 
        'Minya': '086', 'Beni Suef': '082', 'Fayoum': '084', 
        'Matrouh': '046', 'New Valley': '092'
    };

    // ==========================================
    // 1. SPA ROUTING
    // ==========================================
    const navLinks = document.querySelectorAll('.nav-link, .nav-logo, .nav-action');
    const sections = document.querySelectorAll('.page-section');
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const navLinksMenu = document.getElementById('navLinks');

    hamburgerMenu.addEventListener('click', () => navLinksMenu.classList.toggle('active'));

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            if(!targetId) return;

            navLinksMenu.classList.remove('active');

            if(link.classList.contains('nav-link')) {
                document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
                link.classList.add('active');
            }

            sections.forEach(sec => {
                sec.classList.remove('active-section');
                setTimeout(() => sec.classList.add('hidden-section'), 300);
            });

            setTimeout(() => {
                const targetSec = document.getElementById(`section-${targetId}`);
                if(targetSec) {
                    targetSec.classList.remove('hidden-section');
                    setTimeout(() => targetSec.classList.add('active-section'), 50);
                }
            }, 300);

            if(targetId === 'statistics') loadStatistics();
        });
    });

    // ==========================================
    // 2. FORM VALIDATION & SUBMISSION
    // ==========================================
    const complaintForm = document.getElementById('complaintForm');
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const phoneInput = document.getElementById('phoneNumber');
    const phoneTypeSelect = document.getElementById('phoneType');
    const govSelect = document.getElementById('governorate');
    const phoneErrorHelper = document.getElementById('phoneErrorHelper');

    // Dynamic field validation on form submit
    function validatePhone() {
        const type = phoneTypeSelect.value;
        const phone = phoneInput.value.trim();
        const gov = govSelect.value;
        
        phoneInput.classList.remove('error-border');
        phoneErrorHelper.classList.add('hidden');
        
        // Numerics only regex
        if (!/^[0-9]+$/.test(phone)) {
            showErrorState('يجب إدخال أرقام فقط.');
            return false;
        }

        if (type === 'mobile') {
            if (!phone.startsWith('01') || phone.length !== 11) {
                showErrorState('رقم الموبايل يجب أن يبدأ بـ 01 ويتكون من 11 رقم.');
                return false;
            }
        } else if (type === 'landline') {
            if (phone.length < 9 || phone.length > 10) {
                showErrorState('رقم الأرضي يجب أن يتكون من 9 أو 10 أرقام شاملاً كود المحافظة.');
                return false;
            }
            if (gov && governorateCodes[gov]) {
                const prefix = governorateCodes[gov];
                if (!phone.startsWith(prefix)) {
                    showErrorState(`كود المحافظة المحددة (${gov}) يجب أن يبدأ بـ ${prefix}`);
                    return false;
                }
            }
        }
        return true;
    }

    function showErrorState(msg) {
        phoneInput.classList.add('error-border');
        phoneErrorHelper.textContent = msg;
        phoneErrorHelper.classList.remove('hidden');
    }

    if(complaintForm) {
        // Run validation dynamically if they change type while inputted
        phoneInput.addEventListener('input', () => { phoneInput.classList.remove('error-border'); phoneErrorHelper.classList.add('hidden'); });
        
        complaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessage.classList.add('hidden');
            successMessage.classList.add('hidden');

            if (!validatePhone()) {
                window.scrollTo({ top: phoneInput.offsetTop - 100, behavior: 'smooth' });
                return;
            }

            const formData = {
                name: document.getElementById('name').value,
                phoneType: phoneTypeSelect.value,
                phoneNumber: phoneInput.value.trim(),
                governorate: govSelect.value,
                company: document.getElementById('company').value,
                category: document.getElementById('category').value,
                description: document.getElementById('description').value,
                refusedComplaint: document.getElementById('refusedComplaint').checked
            };

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'جاري المعالجة... <span class="spinner" style="width:20px;height:20px;display:inline-block;border-width:2px;vertical-align:middle;margin-right:10px;"></span>';

            try {
                const response = await fetch(API_BASE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    document.getElementById('displayComplaintId').textContent = result.data.customId;
                    successMessage.classList.remove('hidden');
                    complaintForm.reset();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setTimeout(() => successMessage.classList.add('hidden'), 20000);
                } else {
                    errorMessage.innerHTML = `<h3>⚠️ تنبيه إداري</h3><p>${result.message || 'حدث خطأ. حاول مجدداً.'}</p>`;
                    errorMessage.classList.remove('hidden');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } catch (err) {
                errorMessage.innerHTML = `<h3>❌ تعذر الاتصال بالخادم</h3><p>تأكد من تشغيل الشبكة و الخادم.</p>`;
                errorMessage.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'إرسال الشكوى 🚀';
            }
        });
    }

    // ==========================================
    // 3. SECURE TRACK COMPLAINT
    // ==========================================
    const trackForm = document.getElementById('trackForm');
    const trackInputId = document.getElementById('trackInputId');
    const trackInputPhone = document.getElementById('trackInputPhone');
    const trackLoading = document.getElementById('trackLoading');
    const trackResultContainer = document.getElementById('trackResultContainer');
    const trackResultBoxes = document.getElementById('trackResultBoxes');
    const trackBtn = document.getElementById('trackBtn');

    const statusTranslate = { 'Submitted': 'تم الإرسال', 'Under Review': 'قيد المراجعة', 'Escalated': 'مُصعّدة', 'Resolved': 'تم الحل' };
    
    // Governorate translate dictionary mapped back from value to arabic
    const translateGov = {
        'Cairo': 'القاهرة', 'Giza': 'الجيزة', 'Alexandria': 'الإسكندرية', 'Dakahlia': 'الدقهلية', 'Red Sea': 'البحر الأحمر',
        'Beheira': 'البحيرة', 'Fayoum': 'الفيوم', 'Gharbia': 'الغربية', 'Ismailia': 'الإسماعيلية', 'Menofia': 'المنوفية',
        'Minya': 'المنيا', 'Qalyubia': 'القليوبية', 'New Valley': 'الوادي الجديد', 'Suez': 'السويس', 'Aswan': 'أسوان',
        'Assiut': 'أسيوط', 'Beni Suef': 'بني سويف', 'Port Said': 'بورسعيد', 'Damietta': 'دمياط', 'Sharkia': 'الشرقية',
        'South Sinai': 'جنوب سيناء', 'Kafr El Sheikh': 'كفر الشيخ', 'Matrouh': 'مطروح', 'Luxor': 'الأقصر', 'Qena': 'قنا',
        'North Sinai': 'شمال سيناء', 'Sohag': 'سوهاج'
    };

    if(trackForm) {
        trackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idVal = trackInputId.value.trim();
            const phoneVal = trackInputPhone.value.trim();
            if(!idVal || !phoneVal) return;

            trackResultContainer.classList.add('hidden');
            trackLoading.classList.remove('hidden');
            trackResultBoxes.innerHTML = '';
            trackBtn.disabled = true;

            try {
                // Fetch using Query Params
                const response = await fetch(`${API_BASE}/track?id=${encodeURIComponent(idVal)}&phone=${encodeURIComponent(phoneVal)}`);
                const result = await response.json();

                trackLoading.classList.add('hidden');

                if (response.ok && result.success) {
                    const data = result.data;
                    const statusClass = `status-${data.status.replace(/\s+/g, '')}`;
                    const dateObj = new Date(data.createdAt);
                    const formattedDate = dateObj.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                    
                    const govArabic = translateGov[data.governorate] || data.governorate;

                    trackResultBoxes.innerHTML = `
                        <div class="track-result-box">
                            <div class="status-badge ${statusClass}">${statusTranslate[data.status] || data.status}</div>
                            <div style="clear:both;"></div>
                            
                            <div class="track-item mt-15"><span class="label">اسم الشاكي:</span><strong>${data.name || 'غير مسجل'}</strong></div>
                            <div class="track-item"><span class="label">رقم التواصل:</span><strong>${data.phoneNumber} (${data.phoneType === 'mobile' ? 'موبايل' : 'خط أرضي'})</strong></div>
                            <div class="track-item"><span class="label">المحافظة:</span><strong>${govArabic}</strong></div>
                            
                            <div class="track-item"><span class="label">الشركة المزودة:</span><strong style="color:var(--primary);">${data.company}</strong></div>
                            <div class="track-item"><span class="label">نوع المشكلة:</span><strong>${data.category}</strong></div>
                            <div class="track-item"><span class="label">وصف المشكلة:</span><strong style="max-width:300px; text-align:left;">${data.description}</strong></div>
                            
                            <div class="track-item"><span class="label">تاريخ التسجيل:</span><strong>${formattedDate}</strong></div>
                        </div>
                    `;
                    trackResultContainer.classList.remove('hidden');
                } else {
                    trackResultBoxes.innerHTML = `<div class="alert alert-danger"><h3>❌ خطأ وتطابق الهوية</h3><p>${result.message || 'Complaint ID or phone number is incorrect'}</p></div>`;
                    trackResultContainer.classList.remove('hidden');
                }
            } catch (err) {
                console.error(err);
                trackLoading.classList.add('hidden');
                trackResultBoxes.innerHTML = `<div class="alert alert-danger"><h3>❌ خطأ اتصال</h3><p>الفشل في جلب البيانات.</p></div>`;
                trackResultContainer.classList.remove('hidden');
            } finally {
                trackBtn.disabled = false;
            }
        });
    }

    // ==========================================
    // 4. STATISTICS DASHBOARD (Dual Tabs & Infinite Charts)
    // ==========================================
    
    // Tab toggles logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Toggle active classes on buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Hide all contents instantly to prevent display overlaps
            tabContents.forEach(content => {
                content.classList.remove('active-tab');
                content.classList.add('hidden');
            });

            // Show the target content
            const target = document.getElementById(`tabContent-${tabId}`);
            if(target) {
                target.classList.remove('hidden');
                // slight delay to allow CSS opacity transition to fire
                setTimeout(() => target.classList.add('active-tab'), 20);
            }
        });
    });

    async function loadStatistics() {
        document.getElementById('statsEmptyState').classList.add('hidden');
        try {
            const response = await fetch(API_BASE);
            const result = await response.json();

            if (response.ok && result.success) {
                renderDashboard(result.data, result.weeklyProgression);
            }
        } catch (err) {
            console.error('Failed to load stats', err);
        }
    }

    function renderDashboard(complaints, weeklyProgression) {
        const statsEmptyState = document.getElementById('statsEmptyState');
        if (!complaints || complaints.length === 0) {
            statsEmptyState.classList.remove('hidden');
            document.getElementById('tabContent-lifetime').classList.add('hidden');
            document.getElementById('tabContent-weekly').classList.add('hidden');
            document.querySelector('.tabs-container').classList.add('hidden');
            return;
        }

        document.querySelector('.tabs-container').classList.remove('hidden');

        // Infinite Weekly Build
        const tbody = document.getElementById('weeklyTableBody');
        tbody.innerHTML = '';
        
        if (weeklyProgression && weeklyProgression.length > 0) {
            // Update the top 3 stat boxes on Weekly tab (referencing index 0 and 1)
            document.getElementById('wThisWeek').textContent = weeklyProgression[0].totalComplaints;
            document.getElementById('wLastWeek').textContent = weeklyProgression[0].previousComplaints;
            
            const gPrefix = weeklyProgression[0].growthPercentage > 0 ? '+' : '';
            const wGElement = document.getElementById('wGrowth');
            wGElement.textContent = `${gPrefix}${weeklyProgression[0].growthPercentage}%`;
            
            if (weeklyProgression[0].growthPercentage > 0) wGElement.style.color = 'var(--danger)'; 
            else if (weeklyProgression[0].growthPercentage < 0) wGElement.style.color = 'var(--success)';
            else wGElement.style.color = 'var(--text-muted)';

            // Render Table Rows infinitely over progression
            weeklyProgression.forEach(week => {
                const tr = document.createElement('tr');
                const tPrefix = week.growthPercentage > 0 ? '+' : '';
                let colorAttr = '';
                if (week.growthPercentage > 0) colorAttr = 'color: var(--danger);';
                else if (week.growthPercentage < 0) colorAttr = 'color: var(--success);';
                else colorAttr = 'color: var(--text-muted);';

                tr.innerHTML = `
                    <td><strong>${week.weekCode}</strong></td>
                    <td>${week.totalComplaints}</td>
                    <td style="${colorAttr} font-weight:bold;">${tPrefix}${week.growthPercentage}%</td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Lifetime Aggregations
        let total = complaints.length;
        let refusedCount = 0;
        const companyCounts = { 'WE': 0, 'Vodafone': 0, 'Orange': 0, 'Etisalat': 0 };
        const categoryCounts = {};

        complaints.forEach(c => {
            if(c.refusedComplaint) refusedCount++;
            if(companyCounts[c.company] !== undefined) companyCounts[c.company]++;
            const cat = c.category || 'Other';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        let maxComp = '-', maxCompCount = -1;
        for (const [comp, count] of Object.entries(companyCounts)) {
            if (count > maxCompCount) { maxCompCount = count; maxComp = comp; }
        }

        let maxCat = '-', maxCatCount = -1;
        for (const [cat, count] of Object.entries(categoryCounts)) {
            if (count > maxCatCount) { maxCatCount = count; maxCat = cat; }
        }

        document.getElementById('kpiTotal').textContent = total;
        document.getElementById('kpiActiveCompany').textContent = maxCompCount > 0 ? maxComp : '-';
        document.getElementById('kpiRefused').textContent = refusedCount;

        const catTranslate = {
            'General Internet Issues': 'مشاكل عامة', 'Data Limit Issues': 'مشاكل الباقة',
            'Service Market Issues': 'احتكار/تسعير', 'Customer Service Issues': 'خدمة العملاء', 'Other': 'أخرى'
        };
        document.getElementById('kpiCommonIssue').textContent = maxCatCount > 0 ? (catTranslate[maxCat] || maxCat) : '-';

        const highlightText = document.getElementById('commonIssuePercentage');
        if (maxCatCount > 0) {
            const percentage = Math.round((maxCatCount / total) * 100);
            highlightText.innerHTML = `المشكلة الأكبر هي <strong>${catTranslate[maxCat] || maxCat}</strong> وتمثل <strong>${percentage}%</strong> من الشكاوى الموثقة.`;
        }

        drawCompanyChart(companyCounts);
        drawCategoryChart(categoryCounts, catTranslate);
    }

    const chartColors = { 'WE': '#6C4DFF', 'Vodafone': '#FF3B30', 'Orange': '#FF9500', 'Etisalat': '#34C759', 'defaultBg': 'rgba(108, 77, 255, 0.5)', 'defaultBorder': '#6C4DFF' };

    function drawCompanyChart(companyCounts) {
        const ctx = document.getElementById('companyChart').getContext('2d');
        const labels = Object.keys(companyCounts);
        const data = Object.values(companyCounts);
        const bgColors = labels.map(l => chartColors[l]);

        if (companyChartInstance) companyChartInstance.destroy();

        companyChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: labels, datasets: [{ data: data, backgroundColor: bgColors, borderWidth: 0, hoverOffset: 10 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#FFF', font: { family: 'Tajawal' } } } } }
        });
    }

    function drawCategoryChart(categoryCounts, catTranslate) {
        const ctx = document.getElementById('categoryChart').getContext('2d');
        const rawLabels = Object.keys(categoryCounts);
        const labels = rawLabels.map(l => catTranslate[l] || l);
        const data = rawLabels.map(l => categoryCounts[l]);

        if (categoryChartInstance) categoryChartInstance.destroy();

        categoryChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: 'عدد الشكاوى', data: data, backgroundColor: chartColors.defaultBg, borderColor: chartColors.defaultBorder, borderWidth: 1, borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#A0AABF' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#A0AABF', font: { family: 'Tajawal' } }, grid: { display: false } } }, plugins: { legend: { display: false } } }
        });
    }
});
