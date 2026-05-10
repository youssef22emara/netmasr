document.addEventListener('DOMContentLoaded', () => {

    const API_BASE = 'https://netmasrbackend-production.up.railway.app/api/complaints';
    const COMPLAINTS_API = 'https://netmasrbackend-production.up.railway.app/api/complaints';
    const STATS_API = 'https://netmasrbackend-production.up.railway.app/api/complaints/stats';
    const POSTS_API = 'https://netmasrbackend-production.up.railway.app/api/posts';
    const STATS_REFRESH_INTERVAL = 60000;
    let statsRefreshTimer = null;
    let companyChartInstance = null;
    let categoryChartInstance = null;

    // ==========================================
    // TIMEAGO HELPER (Arabic)
    // ==========================================
    function formatTimeAgo(dateString) {
        const now = new Date();
        const postDate = new Date(dateString);
        const diffMs = now - postDate;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);

        if (diffSecs < 60) return 'أقل من دقيقة';
        if (diffMins < 60) return diffMins === 1 ? 'منذ دقيقة' : `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return diffHours === 1 ? 'منذ ساعة' : `منذ ${diffHours} ساعة`;
        if (diffDays < 7) return diffDays === 1 ? 'منذ يوم' : `منذ ${diffDays} أيام`;
        if (diffWeeks < 4) return diffWeeks === 1 ? 'منذ أسبوع' : `منذ ${diffWeeks} أسابيع`;

        return postDate.toLocaleDateString('ar-EG');
    }

    // ==========================================
    // COMMUNITY FEED LOGIC
    // ==========================================
    let allPosts = [];

    async function loadCommunityFeed() {
        try {
            const response = await fetch(POSTS_API);
            const result = await response.json();
            
            if (result.success && Array.isArray(result.data)) {
                allPosts = result.data;
                renderCommunityFeed();
            } else {
                console.error('Invalid posts response:', result);
            }
        } catch (err) {
            console.error('Failed to load community feed:', err);
        }
    }

    function formatArabicNumber(value) {
        return Number(value).toLocaleString('ar-EG');
    }

    function animateCounter(element, targetValue, suffix = '', duration = 1200) {
        const startValue = 0;
        const startTime = performance.now();
        const targetNumber = Number(targetValue) || 0;

        requestAnimationFrame(function animate(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentValue = Math.round(startValue + (targetNumber - startValue) * progress);
            element.textContent = `${formatArabicNumber(currentValue)}${suffix}`;
            if (progress < 1) requestAnimationFrame(animate);
        });
    }

    function getLocalPostState(postId) {
        try {
            const saved = localStorage.getItem(`post_likes_${postId}`);
            if (!saved) return null;
            return JSON.parse(saved);
        } catch (err) {
            console.error('Failed to read post state', err);
            return null;
        }
    }

    function setLocalPostState(postId, state) {
        try {
            localStorage.setItem(`post_likes_${postId}`, JSON.stringify(state));
        } catch (err) {
            console.error('Failed to save post state', err);
        }
    }

    async function fetchLiveStats() {
        const totalEl = document.getElementById('statsTotalComplaints');
        const weeklyEl = document.getElementById('statsWeeklyComplaints');
        const growthEl = document.getElementById('statsGrowthRate');
        const govEl = document.getElementById('statsGovernorateActive');

        try {
            // Fetch complaints data (includes total count and weekly progression)
            const complaintsRes = await fetch(COMPLAINTS_API);
            const complaintsData = await complaintsRes.json();

            // Fetch stats data (includes governorate grouping and companies)
            const statsRes = await fetch(STATS_API);
            const statsData = await statsRes.json();

            // Extract total complaints count
            let totalComplaints = 0;
            if (complaintsData.success && complaintsData.count) {
                totalComplaints = complaintsData.count;
            }

            // Extract weekly data and calculate stats
            let weeklyComplaints = 0;
            let growthPercentage = 0;
            if (complaintsData.success && complaintsData.weeklyProgression && complaintsData.weeklyProgression.length > 0) {
                weeklyComplaints = complaintsData.weeklyProgression[0].totalComplaints;
                growthPercentage = complaintsData.weeklyProgression[0].growthPercentage;
            }

            // Extract top governorate from all complaints
            let topGovernorate = '-';
            if (complaintsData.success && complaintsData.data && Array.isArray(complaintsData.data)) {
                const govCounts = {};
                complaintsData.data.forEach(complaint => {
                    if (complaint.governorate) {
                        govCounts[complaint.governorate] = (govCounts[complaint.governorate] || 0) + 1;
                    }
                });
                
                let maxCount = 0;
                for (const [gov, count] of Object.entries(govCounts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        topGovernorate = gov;
                    }
                }
            }

            // Animate and update the UI
            animateCounter(totalEl, totalComplaints);
            animateCounter(weeklyEl, weeklyComplaints);
            animateCounter(growthEl, Math.round(growthPercentage), '%');
            govEl.textContent = topGovernorate || '-';
        } catch (err) {
            console.error('Failed to load live stats', err);
        }
    }

    function renderCommunityFeed() {
        const feedContainer = document.getElementById('communityFeed');
        if (!feedContainer) return;
        feedContainer.innerHTML = '';

        if (!allPosts || allPosts.length === 0) {
            feedContainer.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">لا توجد منشورات حالياً</div>';
            return;
        }

        allPosts.forEach(post => {
            const card = createPostCard(post);
            feedContainer.appendChild(card);
        });
    }

    function initHistorySection() {
        renderHistoryCharts();
        observeHistoryTimeline();
    }

    function renderHistoryCharts() {
        const usersCtx = document.getElementById('historyUsersChart');
        if (usersCtx && typeof Chart !== 'undefined') {
            new Chart(usersCtx, {
                type: 'line',
                data: {
                    labels: ['1997','2000','2004','2007','2011','2014','2017','2020','2023','2026'],
                    datasets: [
                        {
                            label: 'إنترنت أرضي',
                            data: [0.1, 0.8, 2, 5, 12, 20, 28, 35, 40, 45],
                            borderColor: '#6C4DFF',
                            backgroundColor: 'rgba(108,77,255,0.1)',
                            pointBackgroundColor: '#6C4DFF',
                            pointBorderColor: '#6C4DFF',
                            borderWidth: 3,
                            tension: 0.35,
                            fill: false,
                            pointRadius: 5,
                        },
                        {
                            label: 'إنترنت موبايل',
                            data: [0, 0, 0.5, 3, 10, 25, 45, 60, 72, 80],
                            borderColor: '#1ECCA3',
                            backgroundColor: 'rgba(30,204,163,0.15)',
                            pointBackgroundColor: '#1ECCA3',
                            pointBorderColor: '#1ECCA3',
                            borderWidth: 3,
                            tension: 0.35,
                            fill: false,
                            borderDash: [5, 5],
                            pointRadius: 5,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { ticks: { color: '#C4B5FD' }, grid: { color: 'rgba(255,255,255,0.08)' } },
                        y: { beginAtZero: true, ticks: { color: '#C4B5FD' }, grid: { color: 'rgba(255,255,255,0.08)' } }
                    },
                    plugins: { legend: { display: false } },
                    interaction: { mode: 'index', intersect: false }
                }
            });
        }

        const speedCtx = document.getElementById('historySpeedChart');
        if (speedCtx && typeof Chart !== 'undefined') {
            new Chart(speedCtx, {
                type: 'bar',
                data: {
                    labels: ['Dial-Up 56k','ADSL 256k','ADSL 8M','3G','4G LTE','ألياف ضوئية'],
                    datasets: [{
                        label: 'Mbps',
                        data: [0.056, 0.256, 8, 14, 150, 1000],
                        backgroundColor: ['#888780','#85B7EB','#378ADD','#97C459','#7F77DD','#EF9F27'],
                        borderRadius: 12,
                        barThickness: 24
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'logarithmic',
                            beginAtZero: false,
                            ticks: {
                                color: '#C4B5FD',
                                callback: value => `${value} Mbps`
                            },
                            grid: { color: 'rgba(255,255,255,0.08)' }
                        },
                        y: { ticks: { color: '#C4B5FD' }, grid: { display: false } }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: context => `${context.parsed.x} Mbps`
                            }
                        }
                    },
                    animation: { duration: 900 },
                    layout: { padding: { right: 40 } },
                    plugins: [{
                        id: 'historySpeedLabels',
                        afterDatasetsDraw(chart) {
                            const ctx = chart.ctx;
                            chart.getDatasetMeta(0).data.forEach((bar, index) => {
                                const value = chart.data.datasets[0].data[index];
                                ctx.save();
                                ctx.font = '600 0.95rem Tajawal';
                                ctx.fillStyle = '#FFF';
                                ctx.textAlign = 'left';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(`${value} Mbps`, bar.x + 12, bar.y);
                                ctx.restore();
                            });
                        }
                    }]
                }
            });
        }
    }

    function observeHistoryTimeline() {
        const timelineItems = document.querySelectorAll('.history-timeline-item');
        if (!timelineItems.length || typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.2 });

        timelineItems.forEach(item => observer.observe(item));
    }

    function createPostCard(post) {
        const card = document.createElement('div');
        card.className = 'feed-post-card';
        card.id = `post-${post._id}`;

        const timeAgo = formatTimeAgo(post.createdAt);
        const userVote = getLocalVote(post._id);

        let contentHtml = '';

        if (post.type === 'youtube' && post.youtubeId) {
            contentHtml = `
                <div class="post-content">${escapeHtml(post.caption)}</div>
                <div class="video-wrapper">
                    <iframe width="100%" height="315" src="https://www.youtube.com/embed/${post.youtubeId}" 
                        frameborder="0" allowfullscreen></iframe>
                </div>
            `;
        } else if (post.type === 'facebook' && post.contentUrl) {
            const encodedUrl = encodeURIComponent(post.contentUrl);
            contentHtml = `
                <div class="post-content">${escapeHtml(post.caption)}</div>
                <div class="fb-wrapper">
                    <iframe src="https://www.facebook.com/plugins/post.php?href=${encodedUrl}&width=500&show_text=true" 
                        width="100%" height="400" frameborder="0" allowfullscreen></iframe>
                </div>
            `;
        } else {
            // Text post
            contentHtml = `<div class="post-content">${escapeHtml(post.caption)}</div>`;
        }

        card.innerHTML = `
            <div class="post-header">
                <div class="post-avatar">N</div>
                <div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span class="post-author">NetMasr</span>
                        <span class="verified-badge">✓</span>
                    </div>
                    <div class="post-time">${timeAgo}</div>
                </div>
            </div>
            ${contentHtml}
            <div class="post-actions">
                <button class="react-btn ${userVote === 'like' ? 'liked' : ''}" data-post-id="${post._id}" data-action="like">👍 أعجبني <span class="count">${formatArabicNumber(post.likes)}</span></button>
                <button class="react-btn ${userVote === 'dislike' ? 'disliked' : ''}" data-post-id="${post._id}" data-action="dislike">👎 لم يعجبني <span class="count">${formatArabicNumber(post.dislikes)}</span></button>
            </div>
        `;

        card.querySelectorAll('.react-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const postId = btn.dataset.postId;
                const action = btn.dataset.action;
                handleReaction(postId, action, btn);
            });
        });

        return card;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getLocalVote(postId) {
        try {
            const stored = localStorage.getItem(`vote_${postId}`);
            return stored ? JSON.parse(stored) : null;
        } catch (err) {
            return null;
        }
    }

    function setLocalVote(postId, vote) {
        try {
            localStorage.setItem(`vote_${postId}`, JSON.stringify(vote));
        } catch (err) {
            console.error('Failed to save vote:', err);
        }
    }

    async function handleReaction(postId, action, buttonEl) {
        const currentVote = getLocalVote(postId);
        
        // If they're clicking the same action they already voted on, do nothing
        if ((action === 'like' && currentVote === 'like') || (action === 'dislike' && currentVote === 'dislike')) {
            return;
        }

        try {
            const response = await fetch(`${POSTS_API}/${postId}/react`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Update UI
                const card = document.getElementById(`post-${postId}`);
                const likeBtn = card.querySelector('[data-action="like"]');
                const dislikeBtn = card.querySelector('[data-action="dislike"]');

                likeBtn.querySelector('.count').textContent = formatArabicNumber(result.data.likes);
                dislikeBtn.querySelector('.count').textContent = formatArabicNumber(result.data.dislikes);

                // Update button states
                likeBtn.classList.toggle('liked', action === 'like');
                dislikeBtn.classList.toggle('disliked', action === 'dislike');

                // Save vote locally
                setLocalVote(postId, action);
            } else {
                console.error('Failed to save reaction');
            }
        } catch (err) {
            console.error('Error handling reaction:', err);
        }
    }
    function initHomepageWidgets() {
        fetchLiveStats();
        loadCommunityFeed();
        initHistorySection();
        if (statsRefreshTimer) clearInterval(statsRefreshTimer);
        statsRefreshTimer = setInterval(fetchLiveStats, STATS_REFRESH_INTERVAL);
    }

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

    initHomepageWidgets();

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

    const companyComplaintNumberInput = document.getElementById('companyComplaintNumber');
    const companyComplaintNumberGroup = document.getElementById('companyComplaintNumberGroup');
    const actionButtonsContainer = document.getElementById('actionButtonsContainer');
    const trackActionButtonsContainer = document.getElementById('trackActionButtonsContainer');

    function getArabicCategory(category) {
        const catMap = {
            'General Internet Issues': 'مشاكل عامة في الإنترنت (بطء أو انقطاع)',
            'Data Limit Issues': 'مشاكل باقة / نفاذ الجيجات',
            'Service Market Issues': 'مشاكل احتكار أو تسعير',
            'Customer Service Issues': 'سوء خدمة العملاء',
            'Other': 'أخرى'
        };
        return catMap[category] || category;
    }

    function getNextFridayGoogleCalendarUrl(title, description) {
        const now = new Date();
        const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 10, 0, 0));
        const currentDay = candidate.getUTCDay();
        let diff = (5 - currentDay + 7) % 7;
        if (diff === 0 && now >= candidate) diff = 7;
        candidate.setUTCDate(candidate.getUTCDate() + diff);
        const endDate = new Date(candidate);
        endDate.setUTCHours(endDate.getUTCHours() + 1);

        const formatDate = (date) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
        };

        const dates = `${formatDate(candidate)}/${formatDate(endDate)}`;
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(description)}&dates=${dates}`;
    }

    function generateActionButtons(data, govArabic, container) {
        if (!container) return;

        const name = data.name || 'غير مذكور';
        const category = getArabicCategory(data.category);
        const messageBody = `السلام عليكم،
أود تقديم شكوى رسمية بخصوص خدمة الإنترنت.

رقم الشكوى على منصة NetMasr: ${data.customId}
رابط المنصة: https://netmasr.casacam.net

بيانات الشكوى:
- الاسم: ${name}
- المحافظة: ${govArabic}
- الشركة المزودة: ${data.company}
- نوع المشكلة: ${category}
- وصف المشكلة: ${data.description}

أرجو التكرم بالنظر في هذه الشكوى.`;

        const emailSubject = `شكوى خدمة إنترنت – ${data.company} – ${data.customId}`;
        const whatsappUrl = `https://wa.me/201551515505?text=${encodeURIComponent(messageBody)}`;
        const gmailUrl = `https://mail.google.com/mail/?view=cm&to=complaints@tra.gov.eg&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(messageBody)}`;
        const calendarUrl = getNextFridayGoogleCalendarUrl(`تذكير متابعة شكوى NetMasr ${data.customId}`, messageBody);

        container.innerHTML = `
            <h4 class="escalation-title">📬 أرسل شكوتك للجهاز القومي لتنظيم الاتصالات</h4>
            <div class="escalation-divider"></div>
            <p class="track-action-note">هل أرسلت شكوتك للجهاز القومي؟ إذا لم تفعل، يمكنك إرسالها الآن 👇</p>
            <a href="${whatsappUrl}" target="_blank" class="btn btn-whatsapp btn-block" style="padding: 14px;">أرسل شكوتك عبر واتساب 📲</a>
            <a href="${gmailUrl}" target="_blank" class="btn btn-primary btn-block mt-15" style="padding: 14px;">أرسل شكوتك عبر البريد الإلكتروني 📧</a>
            ${data.refusedComplaint ? '' : `<a href="https://complaints.tra.gov.eg/" target="_blank" class="btn btn-outline-primary btn-block mt-15" style="padding: 14px;">تقديم شكوى رسمية على الموقع الرسمي 🏛️</a>`}
            <a href="${calendarUrl}" target="_blank" class="btn btn-calendar btn-block mt-15" style="padding: 14px;">📅 أضف تذكير الجمعة لتقويمك</a>
        `;
        container.classList.remove('hidden');
    }

    if (companyComplaintNumberGroup) {
        const refusedCheckbox = document.getElementById('refusedComplaint');

        const enableCompanyComplaintNumber = () => {
            companyComplaintNumberInput.disabled = false;
            companyComplaintNumberGroup.classList.remove('disabled-field');
            companyComplaintNumberInput.setAttribute('placeholder', 'أدخل رقم الشكوى الذي أعطتك إياه الشركة');
        };

        const disableCompanyComplaintNumber = () => {
            companyComplaintNumberInput.value = '';
            companyComplaintNumberInput.disabled = true;
            companyComplaintNumberGroup.classList.add('disabled-field');
            companyComplaintNumberInput.setAttribute('placeholder', 'الحقل غير متاح لأن الشركة رفضت إعطاء رقم');
        };

        const toggleCompanyComplaintNumber = () => {
            if (!refusedCheckbox.checked) {
                enableCompanyComplaintNumber();
            } else {
                disableCompanyComplaintNumber();
            }
        };

        refusedCheckbox.addEventListener('change', toggleCompanyComplaintNumber);
        toggleCompanyComplaintNumber();
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
                companyComplaintNumber: companyComplaintNumberInput ? companyComplaintNumberInput.value.trim() : '',
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

                            const govMap = {
                                'Cairo': 'القاهرة', 'Giza': 'الجيزة', 'Alexandria': 'الإسكندرية', 'Dakahlia': 'الدقهلية', 'Red Sea': 'البحر الأحمر',
                                'Beheira': 'البحيرة', 'Fayoum': 'الفيوم', 'Gharbia': 'الغربية', 'Ismailia': 'الإسماعيلية', 'Menofia': 'المنوفية',
                                'Minya': 'المنيا', 'Qalyubia': 'القليوبية', 'New Valley': 'الوادي الجديد', 'Suez': 'السويس', 'Aswan': 'أسوان',
                                'Assiut': 'أسيوط', 'Beni Suef': 'بني سويف', 'Port Said': 'بورسعيد', 'Damietta': 'دمياط', 'Sharkia': 'الشرقية',
                                'South Sinai': 'جنوب سيناء', 'Kafr El Sheikh': 'كفر الشيخ', 'Matrouh': 'مطروح', 'Luxor': 'الأقصر', 'Qena': 'قنا',
                                'North Sinai': 'شمال سيناء', 'Sohag': 'سوهاج'
                            };
                            const govArabic = govMap[formData.governorate] || formData.governorate;

                            generateActionButtons({
                                customId,
                                name: formData.name,
                                company: formData.company,
                                category: formData.category,
                                description: formData.description,
                                refusedComplaint: formData.refusedComplaint
                            }, govArabic, actionButtonsContainer);

                            successMessage.classList.remove('hidden');
                            complaintForm.reset();
                            if (companyComplaintNumberGroup) {
                                companyComplaintNumberGroup.classList.remove('hidden-field');
                            }
                            window.scrollTo({ top: 0, behavior: 'smooth' });
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
            if (trackActionButtonsContainer) {
                trackActionButtonsContainer.classList.add('hidden');
                trackActionButtonsContainer.innerHTML = '';
            }
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
                    if (trackActionButtonsContainer) {
                        trackActionButtonsContainer.classList.add('hidden');
                        generateActionButtons({
                            customId: data.customId,
                            name: data.name,
                            company: data.company,
                            category: data.category,
                            description: data.description,
                            refusedComplaint: data.refusedComplaint
                        }, govArabic, trackActionButtonsContainer);
                    }
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
