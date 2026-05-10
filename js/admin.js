const API_BASE = 'https://netmasrbackend-production.up.railway.app/api/posts';
const ADMIN_KEY = 'Youssef@NetMasr.2026.722008';
let adminPassword = null;
let allPosts = [];

// ========== PASSWORD PROTECTION ==========
function checkAdminAccess() {
    const stored = sessionStorage.getItem('netmasr_admin_pass');
    if (stored === ADMIN_KEY) {
        adminPassword = ADMIN_KEY;
        showAdminPanel();
    } else {
        const pwd = prompt('أدخل كلمة السر الإدارية:');
        if (pwd === ADMIN_KEY) {
            sessionStorage.setItem('netmasr_admin_pass', ADMIN_KEY);
            adminPassword = ADMIN_KEY;
            showAdminPanel();
        } else {
            showUnauthorized();
        }
    }
}

function showAdminPanel() {
    document.getElementById('adminUnauthorized').classList.add('hidden');
    document.getElementById('adminAuthorized').classList.remove('hidden');
    loadPosts();
    setupFormListener();
}

function showUnauthorized() {
    document.getElementById('adminUnauthorized').classList.remove('hidden');
    document.getElementById('adminAuthorized').classList.add('hidden');
}

// ========== ALERTS ==========
function showAlert(type, msg) {
    const alertEl = type === 'success' ? document.getElementById('successAlert') : document.getElementById('errorAlert');
    alertEl.textContent = msg;
    alertEl.classList.remove('hidden');
    setTimeout(() => alertEl.classList.add('hidden'), 5000);
}

// ========== POST LOADING & RENDERING ==========
async function loadPosts() {
    try {
        const response = await fetch(API_BASE);
        const result = await response.json();
        allPosts = result.data || [];
        renderPosts();
    } catch (err) {
        console.error('Error loading posts:', err);
        showAlert('error', 'خطأ في تحميل المنشورات');
    }
}

function renderPosts() {
    const container = document.getElementById('postsListContainer');
    
    if (!allPosts || allPosts.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد منشورات حالياً</div>';
        return;
    }

    container.innerHTML = '';
    allPosts.forEach(post => {
        const postEl = createPostCard(post);
        container.appendChild(postEl);
    });
}

function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.id = `post-${post._id}`;

    const typeMap = { 'text': 'نصي', 'youtube': 'يوتيوب', 'facebook': 'فيسبوك', 'link': 'رابط' };
    const createdDate = new Date(post.createdAt).toLocaleDateString('ar-EG');
    const captionPreview = post.caption.substring(0, 100) + (post.caption.length > 100 ? '...' : '');

    const left = document.createElement('div');
    left.className = 'post-card-left';

    left.innerHTML = `
        <div class="post-type-badge">${typeMap[post.type] || post.type}</div>
        <div class="post-caption-preview">${captionPreview}</div>
        <div class="post-meta">📅 ${createdDate}</div>
        <div class="post-stats">👍 ${post.likes} | 👎 ${post.dislikes}</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'post-card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.textContent = '✏️ تعديل';
    editBtn.onclick = () => editPost(post._id, post.caption);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = '🗑️ حذف';
    deleteBtn.onclick = () => deletePost(post._id);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(left);
    card.appendChild(actions);
    return card;
}

// ========== FORM SUBMISSION ==========
function setupFormListener() {
    const form = document.getElementById('addPostForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const caption = document.getElementById('postCaption').value.trim();
        const contentUrl = document.getElementById('postUrl').value.trim();

        if (!caption) {
            showAlert('error', 'يجب إدخال نص المنشور');
            return;
        }

        try {
            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': adminPassword
                },
                body: JSON.stringify({
                    caption: caption,
                    contentUrl: contentUrl || null
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showAlert('success', '✅ تم نشر المنشور بنجاح!');
                form.reset();
                loadPosts();
            } else {
                showAlert('error', result.message || 'خطأ في نشر المنشور');
            }
        } catch (err) {
            console.error('Error submitting post:', err);
            showAlert('error', 'خطأ في الاتصال بالخادم');
        }
    });
}

// ========== EDIT FUNCTIONALITY ==========
function editPost(postId, currentCaption) {
    const card = document.getElementById(`post-${postId}`);
    const left = card.querySelector('.post-card-left');
    const actions = card.querySelector('.post-card-actions');

    // Replace with edit UI
    left.innerHTML = `
        <textarea class="edit-textarea" id="edit-textarea-${postId}">${currentCaption}</textarea>
        <div style="margin-top: 15px;">
            <button class="btn-save" onclick="savePostEdit('${postId}')">💾 حفظ</button>
            <button class="btn-cancel" onclick="cancelEdit('${postId}', ${JSON.stringify(currentCaption).replace(/'/g, '&#39;')})">❌ إلغاء</button>
        </div>
    `;

    actions.style.display = 'none';
    
    setTimeout(() => {
        const textarea = document.getElementById(`edit-textarea-${postId}`);
        if (textarea) textarea.focus();
    }, 50);
}

async function savePostEdit(postId) {
    const textarea = document.getElementById(`edit-textarea-${postId}`);
    const newCaption = textarea.value.trim();

    if (!newCaption) {
        showAlert('error', 'لا يمكن ترك النص المنشور فارغاً');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': adminPassword
            },
            body: JSON.stringify({ caption: newCaption })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showAlert('success', '✅ تم تحديث المنشور بنجاح!');
            loadPosts();
        } else {
            showAlert('error', result.message || 'خطأ في تحديث المنشور');
        }
    } catch (err) {
        console.error('Error saving edit:', err);
        showAlert('error', 'خطأ في الاتصال بالخادم');
    }
}

function cancelEdit(postId, originalCaption) {
    loadPosts();
}

// ========== DELETE FUNCTIONALITY ==========
async function deletePost(postId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/${postId}`, {
            method: 'DELETE',
            headers: {
                'x-admin-key': adminPassword
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showAlert('success', '✅ تم حذف المنشور بنجاح!');
            const card = document.getElementById(`post-${postId}`);
            card.style.transition = 'opacity 0.3s ease';
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
        } else {
            showAlert('error', result.message || 'خطأ في حذف المنشور');
        }
    } catch (err) {
        console.error('Error deleting post:', err);
        showAlert('error', 'خطأ في الاتصال بالخادم');
    }
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
});
