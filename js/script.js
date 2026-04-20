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
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 300);

            if(targetId === 'statistics') loadStatistics();
            if(targetId === 'comparison') loadComparison();
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
        const phoneStatusHelper = document.getElementById('phoneStatusHelper');

        // Run validation dynamically if they change type while inputted
        phoneInput.addEventListener('input', () => { 
            phoneInput.classList.remove('error-border'); 
            phoneErrorHelper.classList.add('hidden'); 
            phoneStatusHelper.classList.add('hidden');
            submitBtn.disabled = false;
        });

        // Real-time phone check on blur
        phoneInput.addEventListener('blur', async () => {
            const phoneVal = phoneInput.value.trim();
            if (phoneVal.length < 9) return;

            phoneStatusHelper.className = 'input-helper phone-status loading';
            phoneStatusHelper.innerHTML = '⏳ جاري التحقق من الرقم...';
            phoneStatusHelper.classList.remove('hidden');

            try {
                const response = await fetch(`${API_BASE}/check?phone=${encodeURIComponent(phoneVal)}`);
                const result = await response.json();

                if (result.available === false) {
                    phoneStatusHelper.className = 'input-helper phone-status error';
                    phoneStatusHelper.innerHTML = '⚠️ هذا الرقم سجّل شكوى هذا الأسبوع — يمكنك التسجيل مجدداً يوم الجمعة القادم';
                    submitBtn.disabled = true;
                } else if (result.available === true) {
                    phoneStatusHelper.className = 'input-helper phone-status success';
                    phoneStatusHelper.innerHTML = '✅ الرقم متاح للتسجيل هذا الأسبوع';
                    submitBtn.disabled = false;
                }
            } catch(e) {
                console.error('Check phone error', e);
                phoneStatusHelper.classList.add('hidden');
            }
        });
        
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

            grecaptcha.ready(function() {
                grecaptcha.execute('6LchBcEsAAAAAJsTRpZ76rXHR1IqnbdPu_bhIR0B', {action: 'submit_complaint'})
                .then(async function(token) {
                    formData.recaptchaToken = token;
                    
                    try {
                        const response = await fetch(API_BASE, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(formData)
                        });

                        const result = await response.json();

                        if (response.ok && result.success) {
                            const customId = result.data.customId;
                    document.getElementById('displayComplaintId').textContent = customId;
                    
                    // Generate Arabic Escalation Messages
                    const name = formData.name || 'غير مذكور';
                    const govMap = {
                        'Cairo': 'القاهرة', 'Giza': 'الجيزة', 'Alexandria': 'الإسكندرية', 'Dakahlia': 'الدقهلية', 'Red Sea': 'البحر الأحمر',
                        'Beheira': 'البحيرة', 'Fayoum': 'الفيوم', 'Gharbia': 'الغربية', 'Ismailia': 'الإسماعيلية', 'Menofia': 'المنوفية',
                        'Minya': 'المنيا', 'Qalyubia': 'القليوبية', 'New Valley': 'الوادي الجديد', 'Suez': 'السويس', 'Aswan': 'أسوان',
                        'Assiut': 'أسيوط', 'Beni Suef': 'بني سويف', 'Port Said': 'بورسعيد', 'Damietta': 'دمياط', 'Sharkia': 'الشرقية',
                        'South Sinai': 'جنوب سيناء', 'Kafr El Sheikh': 'كفر الشيخ', 'Matrouh': 'مطروح', 'Luxor': 'الأقصر', 'Qena': 'قنا',
                        'North Sinai': 'شمال سيناء', 'Sohag': 'سوهاج'
                    };
                    const govArabic = govMap[formData.governorate] || formData.governorate;

                    const catMap = {
                        'General Internet Issues': 'مشاكل عامة في الإنترنت (بطء أو انقطاع)',
                        'Data Limit Issues': 'مشاكل باقة / نفاذ الجيجات',
                        'Service Market Issues': 'مشاكل احتكار أو تسعير',
                        'Customer Service Issues': 'سوء خدمة العملاء',
                        'Other': 'أخرى'
                    };
                    const catArabic = catMap[formData.category] || formData.category;

                    const msgBody = `السلام عليكم،
أود تقديم شكوى رسمية بخصوص خدمة الإنترنت.

رقم الشكوى على منصة NetMasr: ${customId}
رابط المنصة: https://netmasr.casacam.net

بيانات الشكوى:
- الاسم: ${name}
- رقم الخط: ${formData.phoneNumber}
- المحافظة: ${govArabic}
- الشركة المزودة: ${formData.company}
- نوع المشكلة: ${catArabic}
- وصف المشكلة: ${formData.description}

أرجو التكرم بالنظر في هذه الشكوى.`;

                    // Set URLs for buttons
                    document.getElementById('btnWhatsapp').href = `https://wa.me/201551515505?text=${encodeURIComponent(msgBody)}`;
                    
                    const emailSubj = `شكوى خدمة إنترنت – ${formData.company} – ${customId}`;
                    document.getElementById('btnGmail').href = `https://mail.google.com/mail/?view=cm&to=complaints@tra.gov.eg&su=${encodeURIComponent(emailSubj)}&body=${encodeURIComponent(msgBody)}`;

                    // Handle TRA Button visibility
                    if (formData.refusedComplaint) {
                        document.getElementById('btnTraSite').classList.add('hidden');
                    } else {
                        document.getElementById('btnTraSite').classList.remove('hidden');
                    }

                    successMessage.classList.remove('hidden');
                    complaintForm.reset();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    // Keep visible for 5 minutes so users have time to use the buttons
                    setTimeout(() => successMessage.classList.add('hidden'), 300000); 
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
            });
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

        // TAB 3: Governorate Statistics Breakdown
        const govTransMap = {
            'Cairo':'القاهرة', 'Giza':'الجيزة', 'Alexandria':'الإسكندرية',
            'Dakahlia':'الدقهلية', 'Sharkia':'الشرقية', 'Qalyubia':'القليوبية',
            'Gharbia':'الغربية', 'Beheira':'البحيرة', 'Kafr El Sheikh':'كفر الشيخ',
            'Damietta':'دمياط', 'Port Said':'بورسعيد', 'Ismailia':'الإسماعيلية',
            'Suez':'السويس', 'Red Sea':'البحر الأحمر', 'North Sinai':'شمال سيناء',
            'South Sinai':'جنوب سيناء', 'Luxor':'الأقصر', 'Qena':'قنا',
            'Aswan':'أسوان', 'Sohag':'سوهاج', 'Assiut':'أسيوط',
            'Minya':'المنيا', 'Beni Suef':'بني سويف', 'Fayoum':'الفيوم',
            'Matrouh':'مطروح', 'New Valley':'الوادي الجديد', 'Menofia':'المنوفية'
        };

        const govCounts = {};
        complaints.forEach(c => {
            if(c.governorate) {
                govCounts[c.governorate] = (govCounts[c.governorate] || 0) + 1;
            }
        });

        const govBody = document.getElementById('govTableBody');
        govBody.innerHTML = '';
        const govEntries = Object.entries(govCounts).sort((a, b) => b[1] - a[1]);
        
        if (govEntries.length === 0) {
            govBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);font-weight:bold;">لا توجد بيانات كافية بعد</td></tr>';
        } else {
            govEntries.forEach(([gov, count]) => {
                const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                const arabicName = govTransMap[gov] || gov;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${arabicName}</strong></td>
                    <td>${count}</td>
                    <td>${percentage}%</td>
                    <td>
                        <div style="background: rgba(108, 77, 255, 0.15); border-radius: 4px; height: 8px; width: 100%; overflow: hidden; margin-top:5px;">
                            <div style="background: var(--primary); height: 100%; width: ${percentage}%; border-radius: 4px;"></div>
                        </div>
                    </td>
                `;
                govBody.appendChild(tr);
            });
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

    // ==========================================
    // 5. COMPARISON MODULE (HYBRID DATA)
    // ==========================================
    let compGlobalDataset = [];
    let compCharts = { speed: null, price: null };
    let compIsLoaded = false;

    // Realistic Baseline Dataset (2025-2026 Approx.)
    const staticBaselineData = [
        { id: "EGY", name: "مصر", avg_speed_mbps: 22, max_speed_mbps: 100, avg_price_usd: 12, min_salary_usd: 120, salary_type: "Official", internet_type: "Limited" },
        { id: "SAU", name: "السعودية", avg_speed_mbps: 110, max_speed_mbps: 1000, avg_price_usd: 35, min_salary_usd: 1060, salary_type: "Estimated", internet_type: "Unlimited" },
        { id: "ARE", name: "الإمارات", avg_speed_mbps: 260, max_speed_mbps: 1000, avg_price_usd: 80, min_salary_usd: 1500, salary_type: "Estimated", internet_type: "Unlimited" },
        { id: "QAT", name: "قطر", avg_speed_mbps: 240, max_speed_mbps: 1000, avg_price_usd: 70, min_salary_usd: 1400, salary_type: "Estimated", internet_type: "Unlimited" },
        { id: "KWT", name: "الكويت", avg_speed_mbps: 160, max_speed_mbps: 500, avg_price_usd: 40, min_salary_usd: 1050, salary_type: "Official", internet_type: "Unlimited" },
        { id: "BHR", name: "البحرين", avg_speed_mbps: 110, max_speed_mbps: 500, avg_price_usd: 30, min_salary_usd: 800, salary_type: "Estimated", internet_type: "Unlimited" },
        { id: "OMN", name: "عُمان", avg_speed_mbps: 85, max_speed_mbps: 500, avg_price_usd: 45, min_salary_usd: 845, salary_type: "Official", internet_type: "Unlimited" },
        { id: "JOR", name: "الأردن", avg_speed_mbps: 75, max_speed_mbps: 500, avg_price_usd: 25, min_salary_usd: 365, salary_type: "Official", internet_type: "Unlimited" },
        { id: "MAR", name: "المغرب", avg_speed_mbps: 35, max_speed_mbps: 200, avg_price_usd: 20, min_salary_usd: 300, salary_type: "Official", internet_type: "Unlimited" },
        { id: "DZA", name: "الجزائر", avg_speed_mbps: 20, max_speed_mbps: 100, avg_price_usd: 15, min_salary_usd: 150, salary_type: "Official", internet_type: "Unlimited" },
        { id: "TUN", name: "تونس", avg_speed_mbps: 25, max_speed_mbps: 100, avg_price_usd: 14, min_salary_usd: 145, salary_type: "Official", internet_type: "Unlimited" },
        { id: "IRQ", name: "العراق", avg_speed_mbps: 45, max_speed_mbps: 150, avg_price_usd: 35, min_salary_usd: 250, salary_type: "Estimated", internet_type: "Unlimited" },
        { id: "LBN", name: "لبنان", avg_speed_mbps: 15, max_speed_mbps: 50, avg_price_usd: 25, min_salary_usd: 100, salary_type: "Estimated", internet_type: "Limited" },
        { id: "YEM", name: "اليمن", avg_speed_mbps: 3, max_speed_mbps: 16, avg_price_usd: 15, min_salary_usd: 50, salary_type: "Estimated", internet_type: "Limited" },
        { id: "SYR", name: "سوريا", avg_speed_mbps: 5, max_speed_mbps: 24, avg_price_usd: 10, min_salary_usd: 20, salary_type: "Estimated", internet_type: "Limited" },
        { id: "SDN", name: "السودان", avg_speed_mbps: 8, max_speed_mbps: 30, avg_price_usd: 20, min_salary_usd: 50, salary_type: "Estimated", internet_type: "Limited" },
        { id: "LBY", name: "ليبيا", avg_speed_mbps: 15, max_speed_mbps: 50, avg_price_usd: 20, min_salary_usd: 250, salary_type: "Estimated", internet_type: "Limited" },
        { id: "PSE", name: "فلسطين", avg_speed_mbps: 10, max_speed_mbps: 50, avg_price_usd: 30, min_salary_usd: 400, salary_type: "Estimated", internet_type: "Limited" },
        { id: "MRT", name: "موريتانيا", avg_speed_mbps: 10, max_speed_mbps: 50, avg_price_usd: 35, min_salary_usd: 150, salary_type: "Estimated", internet_type: "Unlimited" },
        { id: "SOM", name: "الصومال", avg_speed_mbps: 5, max_speed_mbps: 20, avg_price_usd: 40, min_salary_usd: 100, salary_type: "Estimated", internet_type: "Limited" },
        { id: "DJI", name: "جيبوتي", avg_speed_mbps: 12, max_speed_mbps: 50, avg_price_usd: 60, min_salary_usd: 150, salary_type: "Estimated", internet_type: "Unlimited" },
        { id: "COM", name: "جزر القمر", avg_speed_mbps: 5, max_speed_mbps: 20, avg_price_usd: 50, min_salary_usd: 100, salary_type: "Estimated", internet_type: "Limited" }
    ];

    async function loadComparison() {
        if(compIsLoaded) return; // Prevent double fetching
        
        // Caching Logic
        const CACHE_KEY = "netmasr_comp_data_v4";
        const cachedStr = localStorage.getItem(CACHE_KEY);
        let parsedCache = null;
        
        if (cachedStr) {
            try {
                parsedCache = JSON.parse(cachedStr);
                const now = Date.now();
                // Check if older than 24h (24 * 60 * 60 * 1000)
                if (now - parsedCache.timestamp < 86400000) {
                    compGlobalDataset = parsedCache.data;
                    document.getElementById('comp-last-update-date').textContent = new Date(parsedCache.timestamp).toLocaleDateString('ar-EG');
                    initComparisonUI();
                    compIsLoaded = true;
                    return;
                }
            } catch(e) { console.error("Cache parsing error", e); }
        }

        // Fetch new data (Hybrid merge)
        try {
            const [restRes, wbRes] = await Promise.allSettled([
                fetch('https://restcountries.com/v3.1/lang/arabic'),
                fetch('https://api.worldbank.org/v2/country/all/indicator/IT.NET.USER.ZS?format=json&date=2022&per_page=1000')
            ]);

            const restData = restRes.status === 'fulfilled' ? await restRes.value.json() : [];
            const wbDataRaw = wbRes.status === 'fulfilled' ? await wbRes.value.json() : [];
            const wbMap = {};

            if (wbDataRaw && wbDataRaw[1]) {
                wbDataRaw[1].forEach(item => {
                    if (item.countryiso3code && item.value !== null) {
                        wbMap[item.countryiso3code] = item.value;
                    }
                });
            }

            // Map baseline to final
            let mergedData = staticBaselineData.map(base => {
                let countryMeta = restData.find(c => c.cca3 === base.id) || {};
                let flagUrl = countryMeta.flags ? (countryMeta.flags.svg || countryMeta.flags.png) : "";
                
                return {
                    id: base.id,
                    name: base.name,
                    avg_speed_mbps: base.avg_speed_mbps,
                    max_speed_mbps: base.max_speed_mbps,
                    avg_price_usd: base.avg_price_usd,
                    min_salary_usd: base.min_salary_usd,
                    salary_type: base.salary_type,
                    internet_type: base.internet_type,
                    affordability_percent: base.min_salary_usd ? ((base.avg_price_usd / base.min_salary_usd) * 100).toFixed(1) : null,
                    flag: flagUrl,
                    usage_percent: wbMap[base.id] || null
                };
            });

            compGlobalDataset = mergedData;
            
            // Save to Cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data: compGlobalDataset
            }));
            
            document.getElementById('comp-last-update-date').textContent = new Date().toLocaleDateString('ar-EG');
            initComparisonUI();
            compIsLoaded = true;
            
        } catch(err) {
            console.error("Comparison Hybrid Fetch Error:", err);
            // Complete Fallback
            compGlobalDataset = staticBaselineData;
            initComparisonUI();
            compIsLoaded = true;
        }
    }

    function initComparisonUI() {
        const selector = document.getElementById('country-select');
        selector.innerHTML = '';
        
        compGlobalDataset.sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        
        compGlobalDataset.forEach(c => {
            if (c.id !== "EGY") {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                selector.appendChild(opt);
            }
        });

        const defaultCompare = compGlobalDataset.find(c => c.id === 'SAU') || compGlobalDataset.find(c => c.id !== 'EGY');
        if(defaultCompare) selector.value = defaultCompare.id;

        selector.addEventListener('change', (e) => compUpdateUI(e.target.value));

        document.getElementById('charts-wrapper').style.display = 'grid';
        document.getElementById('table-wrapper').style.display = 'block';
        compUpdateUI(selector.value);
        compRenderTable();
    }

    function compUpdateUI(compareId) {
        const egyptData = compGlobalDataset.find(c => c.id === 'EGY');
        const compareData = compGlobalDataset.find(c => c.id === compareId);
        if(!egyptData || !compareData) return;

        compFillCard('egypt', egyptData);
        compFillCard('compare', compareData);
        compGenerateInsight(egyptData, compareData);
        compUpdateCharts(egyptData, compareData);
    }

    function compFillCard(prefix, data) {
        document.getElementById(`name-${prefix}`).textContent = data.name;
        const flagEl = document.getElementById(`flag-${prefix}`);
        if(data.flag) {
            flagEl.src = data.flag;
            flagEl.style.display = 'block';
        } else {
            flagEl.style.display = 'none';
        }
        document.getElementById(`avg-speed-${prefix}`).textContent = data.avg_speed_mbps || 'N/A';
        document.getElementById(`max-speed-${prefix}`).textContent = data.max_speed_mbps || 'N/A';
        document.getElementById(`price-${prefix}`).textContent = data.avg_price_usd ? `${data.avg_price_usd}` : 'N/A';
        document.getElementById(`salary-${prefix}`).innerHTML = data.min_salary_usd ? `${data.min_salary_usd} <span style="font-size: 0.8rem; color:#94A3B8;">(${data.salary_type || 'مقدر'})</span>` : 'N/A';
        document.getElementById(`affordability-${prefix}`).textContent = data.affordability_percent ? `${data.affordability_percent}%` : 'N/A';

        // Internet Type Logic
        const typeEl = document.getElementById(`type-${prefix}`);
        if(typeEl && data.internet_type) {
            const isUnlimited = data.internet_type === "Unlimited";
            const badgeColor = isUnlimited ? "#22C55E" : "#EF4444";
            const badgeText = isUnlimited ? "غير محدود" : "باقات محدودة";
            typeEl.innerHTML = `<span style="background:${badgeColor}20; color:${badgeColor}; padding: 4px 10px; border-radius: 4px; font-weight:bold; border: 1px solid ${badgeColor}50;">${badgeText}</span>`;
        }
    }

    function compGenerateInsight(egypt, compare) {
        const insightSection = document.getElementById('auto-insight');
        const insightText = document.getElementById('insight-text');
        
        let sentence = "";
        
        if(egypt.affordability_percent && compare.affordability_percent) {
            let egAfford = parseFloat(egypt.affordability_percent);
            let compAfford = parseFloat(compare.affordability_percent);
            
            if(compAfford < egAfford) {
                sentence = `رغم أن السرعة في <strong>${compare.name}</strong> أعلى، إلا أن تكلفة الإنترنت كنسبة من الدخل في <strong>${compare.name}</strong> (${compAfford}%) أقل بكثير و أخف عبئاً مقارنة بـ <strong>مصر</strong> (${egAfford}%).`;
            } else {
                sentence = `مؤشر القدرة الشرائية يوضح أن العبء المالي للإنترنت في <strong>مصر</strong> (${egAfford}%) أفضل من <strong>${compare.name}</strong> (${compAfford}%).`;
            }

            if (egypt.internet_type === "Limited" && compare.internet_type === "Unlimited") {
                sentence += `<br><br><span style="color:#22C55E;">💡 ملاحظة هامة: الإنترنت في ${compare.name} غير محدود (Unlimited)، بينما يعتمد الإنترنت في مصر على الكوتة والباقات المحدودة!</span>`;
            } else if (egypt.internet_type === "Unlimited" && compare.internet_type === "Limited") {
                sentence += `<br><br><span style="color:#EF4444;">💡 ملاحظة: الإنترنت في مصر غير محدود، بينما يعتمد في ${compare.name} على الباقات المحدودة!</span>`;
            }
        } else {
            sentence = `البيانات المعروضة تعتمد على تقارير عالمية وتقديرات اقتصادية لغرض المقارنة وتحديد العبء الحقيقي.`;
        }

        insightText.innerHTML = sentence;
        insightSection.style.display = 'block';
    }

    function compUpdateCharts(egypt, compare) {
        const ctxSpeed = document.getElementById('compSpeedChart').getContext('2d');
        const ctxPrice = document.getElementById('compPriceChart').getContext('2d');

        const labels = [egypt.name, compare.name];
        if (compCharts.speed) compCharts.speed.destroy();
        compCharts.speed = new Chart(ctxSpeed, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'متوسط السرعة (Avg Mbps)',
                    data: [egypt.avg_speed_mbps, compare.avg_speed_mbps],
                    backgroundColor: ['#22C55E', '#6C4DFF'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#fff', font: { family: 'Tajawal' } } } },
                scales: {
                    y: { ticks: { color: '#94A3B8' }, grid: { color: '#2E364F' } },
                    x: { ticks: { color: '#94A3B8', font: { family: 'Tajawal' } }, grid: { display: false } }
                }
            }
        });

        if (compCharts.price) compCharts.price.destroy();
        compCharts.price = new Chart(ctxPrice, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'مؤشر القدرة الشرائية (%)',
                    data: [egypt.affordability_percent, compare.affordability_percent],
                    backgroundColor: ['#22C55E', '#6C4DFF'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#fff', font: { family: 'Tajawal' } } } },
                scales: {
                    y: { ticks: { color: '#94A3B8' }, grid: { color: '#2E364F' } },
                    x: { ticks: { color: '#94A3B8', font: { family: 'Tajawal' } }, grid: { display: false } }
                }
            }
        });
    }

    function compRenderTable() {
        const tbody = document.getElementById('comp-table-body');
        tbody.innerHTML = '';
        
        compGlobalDataset.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 1rem; border-bottom: 1px solid #2E364F; display:flex; align-items:center; gap:0.5rem; justify-content:flex-end;">
                    <span>${c.name}</span>
                    ${c.flag ? '<img src="' + c.flag + '" width="24" style="border-radius:2px;" alt="">' : ''}
                </td>
                <td style="padding: 1rem; border-bottom: 1px solid #2E364F;">${c.avg_speed_mbps || '-'}</td>
                <td style="padding: 1rem; border-bottom: 1px solid #2E364F;">${c.max_speed_mbps || '-'}</td>
                <td style="padding: 1rem; border-bottom: 1px solid #2E364F;">
                    ${c.internet_type === 'Unlimited' ? '<span style="color:#22C55E;font-weight:bold;">غير محدود</span>' : (c.internet_type === 'Limited' ? '<span style="color:#EF4444;font-weight:bold;">باقات محدودة</span>' : '-')}
                </td>
                <td style="padding: 1rem; border-bottom: 1px solid #2E364F;">${c.avg_price_usd || '-'}</td>
                <td style="padding: 1rem; border-bottom: 1px solid #2E364F;">${c.min_salary_usd ? c.min_salary_usd + " <span style='font-size:0.8rem;color:#94A3B8'>(" + (c.salary_type||'مقدر') + ")</span>" : '-'}</td>
                <td style="padding: 1rem; border-bottom: 1px solid #2E364F; font-weight:bold; color:#6C4DFF;">${c.affordability_percent ? c.affordability_percent + '%' : '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }
});
