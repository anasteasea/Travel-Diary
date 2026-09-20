document.addEventListener('DOMContentLoaded', () => {
    // Авторизация и данные сессии
    const authScreen = document.getElementById('auth-screen');
    const mainScreen = document.getElementById('main-screen');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const logoutBtn = document.getElementById('logout-btn');
    const userBadge = document.getElementById('user-badge');

    // Форма, вкладки и фильтры
    const postForm = document.getElementById('post-form');
    const geoBtn = document.getElementById('geo-btn');
    const postsContainer = document.getElementById('posts-container');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const formTitle = document.getElementById('form-title');
    const submitFormBtn = document.getElementById('submit-form-btn');
    const sortSelect = document.getElementById('sort-select');
    const searchInput = document.getElementById('search-input');
    const feedAllBtn = document.getElementById('feed-all-btn');
    const feedMyBtn = document.getElementById('feed-my-btn');
    const feedTitle = document.getElementById('feed-title');

    // Текущий вошедший пользователь
    let currentUser = 'traveler';
    // Режим ленты: 'all' (все пользователи) или 'my' (только текущий)
    let currentFeedMode = 'all'; 
    // Переменная для временного хранения загруженного base64-изображения
    let uploadedImageBase64 = '';
    // Объект карты Яндекс
    let myMap = null;

    // ГЕНЕРАЦИЯ ДЕМО-ДАННЫХ ДЛЯ ДРУГИХ ПОЛЬЗОВАТЕЛЕЙ (Загружается один раз)
    const demoPosts = [
        {
            id: 10001,
            author: 'alex_trip',
            location: '41.8902, 12.4922',
            title: 'Рим, Италия',
            image: 'https://unsplash.com',
            cost: 850,
            heritage: 'Колизей, Римский форум, Ватикан',
            places: 'Кафе у Пантеона, улочки Трастевере',
            ratings: { transport: 4, safety: 4, population: 5, nature: 3 },
            likes: ['masha_w', 'traveler'],
            comments: [{ user: 'masha_w', text: 'Рим прекрасен! Тоже хочу туда.' }]
        },
        {
            id: 10002,
            author: 'elena_nature',
            location: '64.1265, -21.8174',
            title: 'Рейкьявик, Исландия',
            image: 'https://unsplash.com',
            cost: 1900,
            heritage: 'Национальный парк Тингведлир',
            places: 'Голубая Лагуна, водопад Скогафосс',
            ratings: { transport: 3, safety: 5, population: 1, nature: 5 },
            likes: ['alex_trip'],
            comments: [{ user: 'alex_trip', text: 'Космические пейзажи! Бюджет приличный.' }]
        }
    ];

    let travelPosts = JSON.parse(localStorage.getItem('travel_posts_v2'));
    if (!travelPosts) {
        travelPosts = demoPosts;
        localStorage.setItem('travel_posts_v2', JSON.stringify(travelPosts));
    }

    // --- ИНИЦИАЛИЗАЦИЯ ЯНДЕКС.КАРТ ---
    function initMap() {
        if (myMap) return;

        ymaps.ready(() => {
            myMap = new ymaps.Map("map", {
                center: [55.7558, 37.6173], // Москва по умолчанию
                zoom: 2,
                controls: ['zoomControl', 'typeSelector']
            });

            // Клик по карте автоматически заполняет поле с координатами
            myMap.events.add('click', (e) => {
                const coords = e.get('coords');
                document.getElementById('post-location').value = `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`;
            });
            
            renderPosts();
        });
    }

    // --- ОБНОВЛЕНИЕ МАРКЕРОВ ЯНДЕКС.КАРТ ---
    function updateMapMarkers(postsToDisplay) {
        if (!myMap) return;

        myMap.geoObjects.removeAll();

        postsToDisplay.forEach(post => {
            const parts = post.location.split(',');
            if (parts.length === 2) {
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    const myPlacemark = new ymaps.Placemark([lat, lng], {
                        balloonContentHeader: `<b>${post.title}</b>`,
                        balloonContentBody: `Автор: @${post.author}<br>Бюджет: $${post.cost}`,
                        hintContent: post.title
                    }, {
                        preset: 'islands#blueCircleDotIcon'
                    });

                    myMap.geoObjects.add(myPlacemark);
                }
            }
        });
    }

    // --- АВТОРИЗАЦИЯ ---
    tabLogin.addEventListener('click', () => toggleTabs('login'));
    tabRegister.addEventListener('click', () => toggleTabs('register'));
    function toggleTabs(t) {
        tabLogin.classList.toggle('active', t === 'login'); 
        tabRegister.classList.toggle('active', t === 'register');
        formLogin.classList.toggle('active', t === 'login'); 
        formRegister.classList.toggle('active', t === 'register');
    }
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        currentUser = document.getElementById('login-username').value || 'traveler';
        showMainApp();
    });
    formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        currentUser = document.getElementById('reg-username').value || 'traveler';
        showMainApp();
    });
    logoutBtn.addEventListener('click', () => {
        mainScreen.classList.add('hidden'); 
        authScreen.classList.remove('hidden');
        document.body.style.alignItems = 'center';
    });

    function showMainApp() {
        userBadge.textContent = `@${currentUser}`;
        authScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        document.body.style.alignItems = 'flex-start';
        
        // Задержка гарантирует, что блок #map успел получить размеры в DOM
        setTimeout(() => { 
            initMap(); 
        }, 100);
    }

    // Обработка загрузки файла изображения с устройства
    document.getElementById('post-image-file').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedImageBase64 = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Настройка ползунков оценок
    const sliders = ['transport', 'safety', 'population', 'nature'];
    sliders.forEach(id => {
        const s = document.getElementById(`rate-${id}`);
        const v = document.getElementById(`val-${id}`);
        s.addEventListener('input', () => v.textContent = s.value);
    });

    // GPS Геолокация
    geoBtn.addEventListener('click', () => {
        if (!navigator.geolocation) return alert('Браузер не поддерживает GPS');
        geoBtn.textContent = '⏳';
        navigator.geolocation.getCurrentPosition(
            (p) => {
                document.getElementById('post-location').value = `${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`;
                geoBtn.textContent = '📍';
            },
            () => { alert('Доступ отклонен'); geoBtn.textContent = '📍'; }
        );
    });

    // --- ПЕРЕКЛЮЧЕНИЕ МЕЖДУ ЛЕНТАМИ ---
    feedAllBtn.addEventListener('click', () => {
        currentFeedMode = 'all';
        feedAllBtn.classList.add('active');
        feedMyBtn.classList.remove('active');
        feedTitle.textContent = 'Общая лента путешествий';
        renderPosts();
    });

    feedMyBtn.addEventListener('click', () => {
        currentFeedMode = 'my';
        feedMyBtn.classList.add('active');
        feedAllBtn.classList.remove('active');
        feedTitle.textContent = 'Мой личный дневник';
        renderPosts();
    });

    // --- СОХРАНЕНИЕ / ОБНОВЛЕНИЕ ЗАПИСИ ---
    postForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('post-id').value;

        let finalImage = uploadedImageBase64 || 'https://unsplash.com';

        if (editId) {
            const oldPost = travelPosts.find(p => p.id === parseInt(editId));
            if (!uploadedImageBase64 && oldPost) finalImage = oldPost.image;
        }

        const postData = {
            id: editId ? parseInt(editId) : Date.now(),
            author: editId ? travelPosts.find(p => p.id === parseInt(editId)).author : currentUser,
            location: document.getElementById('post-location').value,
            title: document.getElementById('post-title').value,
            image: finalImage,
            cost: parseFloat(document.getElementById('post-cost').value),
            heritage: document.getElementById('post-heritage').value || 'Не указано',
            places: document.getElementById('post-places').value || 'Не указано',
            ratings: {
                transport: document.getElementById('rate-transport').value,
                safety: document.getElementById('rate-safety').value,
                population: document.getElementById('rate-population').value,
                nature: document.getElementById('rate-nature').value
            },
            likes: editId ? travelPosts.find(p => p.id === parseInt(editId)).likes : [],
            comments: editId ? travelPosts.find(p => p.id === parseInt(editId)).comments : []
        };

        if (editId) {
            travelPosts = travelPosts.map(p => p.id === postData.id ? postData : p);
            resetEditorState();
        } else {
            travelPosts.unshift(postData);
        }

        saveAndRender();
        postForm.reset();
        uploadedImageBase64 = ''; 
    });

    window.editPost = function(id) {
        const post = travelPosts.find(p => p.id === id);
        if (!post) return;

        document.getElementById('post-id').value = post.id;
        document.getElementById('post-location').value = post.location;
        document.getElementById('post-title').value = post.title;
        document.getElementById('post-cost').value = post.cost;
        document.getElementById('post-heritage').value = post.heritage;
        document.getElementById('post-places').value = post.places;

        sliders.forEach(name => {
            document.getElementById(`rate-${name}`).value = post.ratings[name];
            document.getElementById(`val-${name}`).textContent = post.ratings[name];
        });

        formTitle.textContent = 'Редактировать пост';
        submitFormBtn.textContent = 'Сохранить изменения';
        cancelEditBtn.classList.remove('hidden');
    };

    cancelEditBtn.addEventListener('click', resetEditorState);
    function resetEditorState() {
        postForm.reset();
        document.getElementById('post-id').value = '';
        formTitle.textContent = 'Новое путешествие';
        submitFormBtn.textContent = 'Опубликовать';
        cancelEditBtn.classList.add('hidden');
        uploadedImageBase64 = '';
    }

    window.deletePost = function(id) {
        if (confirm('Удалить эту поездку?')) {
            travelPosts = travelPosts.filter(p => p.id !== id);
            saveAndRender();
        }
    };

    // --- СОЦИАЛЬНАЯ ЛОГИКА: ЛАЙКИ И КОММЕНТАРИИ ---
    window.toggleLike = function(id) {
        travelPosts = travelPosts.map(post => {
            if (post.id === id) {
                if (post.likes.includes(currentUser)) {
                    post.likes = post.likes.filter(u => u !== currentUser);
                } else {
                    post.likes.push(currentUser);
                }
            }
            return post;
        });
        saveAndRender();
    };

    window.addComment = function(e, id) {
        e.preventDefault();
        const input = document.getElementById(`comm-input-${id}`);
        const text = input.value.trim();
        if (!text) return;

        travelPosts = travelPosts.map(post => {
            if (post.id === id) {
                post.comments.push({ user: currentUser, text: text });
            }
            return post;
        });

        input.value = '';
        saveAndRender();
    };

    function saveAndRender() {
        localStorage.setItem('travel_posts_v2', JSON.stringify(travelPosts));
        renderPosts();
    }

    sortSelect.addEventListener('change', renderPosts);
    searchInput.addEventListener('input', renderPosts);

    // --- СБОРКА И СОРТИРОВКА ЛЕНТЫ ПОСТОВ ---
    function renderPosts() {
        postsContainer.innerHTML = '';
        
        let filtered = [...travelPosts];
        if (currentFeedMode === 'my') {
            filtered = filtered.filter(p => p.author === currentUser);
        }

        const query = searchInput.value.toLowerCase();
        if (query) {
            filtered = filtered.filter(p => 
                p.title.toLowerCase().includes(query) || 
                p.location.toLowerCase().includes(query) || 
                p.heritage.toLowerCase().includes(query)
            );
        }

        const sortBy = sortSelect.value;
        if (sortBy === 'newest') filtered.sort((a,b) => b.id - a.id);
        if (sortBy === 'cheap') filtered.sort((a,b) => a.cost - b.cost);
        if (sortBy === 'popular') filtered.sort((a,b) => b.likes.length - a.likes.length);

        updateMapMarkers(filtered);

        if (filtered.length === 0) {
            postsContainer.innerHTML = '<p style="text-align:center; color:#57606f; padding: 20px;">Записи отсутствуют.</p>';
            return;
        }

        filtered.forEach(post => {
            const isMyPost = (post.author === currentUser);
            const hasLiked = post.likes.includes(currentUser);

            let commentsHTML = '';
            post.comments.forEach(c => {
                commentsHTML += `<div class="comment-item"><strong>@${c.user}</strong>: ${c.text}</div>`;
            });

            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <span class="post-author">👤 @${post.author}</span>
                ${isMyPost ? `
                <div class="post-actions">
                    <button class="action-btn edit-btn" onclick="editPost(${post.id})">✏️</button>
                    <button class="action-btn delete-btn" onclick="deletePost(${post.id})">🗑️</button>
                </div>` : ''}
                <img src="${post.image}" class="post-img" alt="Фото">
                <div class="post-content">
                    <div class="post-header-info">
                        <span class="post-location">📍 ${post.title}</span>
                        <span class="post-cost">$${post.cost}</span>
                    </div>
                    <div class="post-details">
                        <p><strong>🏛️ Наследие:</strong> ${post.heritage}</p>
                        <p><strong>🗺️ Места:</strong> ${post.places}</p>
                    </div>
                    <div class="post-badges">
                        <span class="badge">🚲 Транспорт: ${post.ratings.transport}/5</span>
                        <span class="badge">🛡️ Безопасность: ${post.ratings.safety}/5</span>
                        <span class="badge">👥 Люди: ${post.ratings.population}/5</span>
                        <span class="badge">🌿 Природа: ${post.ratings.nature}/5</span>
                    </div>
                    
                    <div class="social-bar">
                        <button class="like-btn ${hasLiked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                            ${hasLiked ? '❤️' : '🤍'} ${post.likes.length}
                        </button>
                    </div>

                    <div class="comments-section">
                        <h4>Комментарии (${post.comments.length})</h4>
                        <div class="comments-list">${commentsHTML || '<p style="font-size:11px; color:#a4b0be">Нет комментариев</p>'}</div>
                        <form class="comment-form" onsubmit="addComment(event, ${post.id})">
                            <input type="text" id="comm-input-${post.id}" placeholder="Написать комментарий..." required>
                            <button type="submit">Отправить</button>
                        </form>
                    </div>
                </div>
            `;
            postsContainer.appendChild(card);
        });
    }
});
