// telegram-auth.js v3.1 - Модуль авторизации с настраиваемым временем загрузки

// НАСТРОЙКА ВРЕМЕНИ ПОКАЗА ЭКРАНА ЗАГРУЗКИ (в миллисекундах)
// Измените это значение для изменения времени показа splash screen
const LOADING_SCREEN_DURATION = 10000; // 6 секунд (измените на нужное значение)

class TelegramAuth {
    constructor() {
        this.tg = null;
        this.userData = null;
        this.isInitialized = false;
        this.authEndpoint = 'auth/telegram_auth.php';
        this.updateEndpoint = 'auth/update_user_data.php';
        this.getDataEndpoint = 'auth/get_user_data.php';
    }

    // Инициализация модуля
    async init() {
        console.log('🔐 Инициализация модуля авторизации v3.1...');
        console.log(`⏱️ Время показа загрузочного экрана: ${LOADING_SCREEN_DURATION}мс`);

        try {
            // Проверяем наличие Telegram WebApp
            if (typeof window.Telegram === 'undefined' || !window.Telegram.WebApp) {
                console.warn('⚠️ Telegram WebApp API не доступен');
                // В режиме разработки можем продолжить без авторизации
                if (this.isDevelopment()) {
                    console.log('🔧 Режим разработки - продолжаем без авторизации');
                    this.userData = this.getMockUserData();
                    this.updateUI();
                    return true;
                }
                return false;
            }

            this.tg = window.Telegram.WebApp;
            this.tg.ready();
            this.tg.expand();

            console.log('📱 Telegram WebApp готов к работе');

            // Настройка внешнего вида
            this.setupAppearance();

            // Авторизация пользователя
            const authSuccess = await this.authenticateUser();
            
            if (authSuccess) {
                // Загружаем данные пользователя
                await this.loadUserData();
                this.updateUI();
                console.log('✅ Авторизация завершена успешно');
                return true;
            }

            console.error('❌ Ошибка авторизации');
            return false;

        } catch (error) {
            console.error('❌ Критическая ошибка инициализации:', error);
            return false;
        }
    }

    // Настройка внешнего вида приложения
    setupAppearance() {
        if (!this.tg) return;

        // Устанавливаем цвета
        this.tg.setHeaderColor('#1a1a1a');
        this.tg.setBackgroundColor('#000000');

        // Включаем кнопку закрытия
        this.tg.enableClosingConfirmation();

        console.log('🎨 Внешний вид настроен');
    }

    // Авторизация пользователя
    async authenticateUser() {
        console.log('🔐 Начинаем авторизацию пользователя...');

        try {
            const initData = this.tg?.initData || '';
            
            if (!initData && !this.isDevelopment()) {
                console.error('❌ Отсутствуют данные инициализации');
                return false;
            }

            // В режиме разработки используем тестовые данные
            if (this.isDevelopment() && !initData) {
                console.log('🔧 Используем тестовые данные для разработки');
                this.userData = this.getMockUserData();
                return true;
            }

            // Отправляем данные на сервер для проверки
            const response = await fetch(this.authEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: initData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log('✅ Пользователь авторизован:', result.user);
                return true;
            } else {
                console.error('❌ Ошибка авторизации:', result.message);
                return false;
            }

        } catch (error) {
            console.error('❌ Ошибка при авторизации:', error);
            return false;
        }
    }

    // Загрузка данных пользователя
    async loadUserData() {
        console.log('📊 Загружаем данные пользователя...');

        try {
            const userId = this.getUserId();
            if (!userId) {
                console.warn('⚠️ ID пользователя не найден');
                return;
            }

            const response = await fetch(this.getDataEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.userData = data.user_data;
                console.log('✅ Данные пользователя загружены:', this.userData);
            } else {
                console.warn('⚠️ Не удалось загрузить данные:', data.message);
                // Инициализируем пустые данные
                this.userData = {
                    favorites: [],
                    likes: [],
                    dislikes: []
                };
            }

        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            // Инициализируем пустые данные при ошибке
            this.userData = {
                favorites: [],
                likes: [],
                dislikes: []
            };
        }
    }

    // Обновление данных пользователя
    async updateUserData(data) {
        console.log('💾 Сохраняем данные пользователя...');

        try {
            const userId = this.getUserId();
            if (!userId) {
                console.warn('⚠️ ID пользователя не найден');
                return false;
            }

            const response = await fetch(this.updateEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    ...data
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log('✅ Данные успешно сохранены');
                // Обновляем локальные данные
                this.userData = { ...this.userData, ...data };
                return true;
            } else {
                console.error('❌ Ошибка сохранения:', result.message);
                return false;
            }

        } catch (error) {
            console.error('❌ Ошибка при сохранении данных:', error);
            return false;
        }
    }

    // Получение ID пользователя
    getUserId() {
        if (this.tg?.initDataUnsafe?.user?.id) {
            return this.tg.initDataUnsafe.user.id.toString();
        }
        
        if (this.isDevelopment()) {
            return 'test_user_123';
        }

        return null;
    }

    // Получение данных пользователя
    getUserData() {
        return this.userData;
    }

    // Проверка режима разработки
    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('.local');
    }

    // Тестовые данные для разработки
    getMockUserData() {
        return {
            favorites: [],
            likes: [],
            dislikes: [],
            user_id: 'test_user_123',
            username: 'Test User'
        };
    }

    // Обновление UI после авторизации
    updateUI() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const videoContainer = document.getElementById('videoContainer');

        // Показываем загрузочный экран минимум LOADING_SCREEN_DURATION миллисекунд
        setTimeout(() => {
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }

            if (videoContainer) {
                videoContainer.style.display = 'block';
            }
        }, LOADING_SCREEN_DURATION);
    }

    // Показ уведомления
    showNotification(message) {
        if (this.tg?.showPopup) {
            this.tg.showPopup({
                title: 'DoramaShorts',
                message: message,
                buttons: [{
                    type: 'ok'
                }]
            });
        } else {
            alert(message);
        }
    }

    // Вибрация (для мобильных устройств)
    hapticFeedback(type = 'light') {
        if (this.tg?.HapticFeedback) {
            switch(type) {
                case 'light':
                    this.tg.HapticFeedback.impactOccurred('light');
                    break;
                case 'medium':
                    this.tg.HapticFeedback.impactOccurred('medium');
                    break;
                case 'heavy':
                    this.tg.HapticFeedback.impactOccurred('heavy');
                    break;
                case 'success':
                    this.tg.HapticFeedback.notificationOccurred('success');
                    break;
                case 'warning':
                    this.tg.HapticFeedback.notificationOccurred('warning');
                    break;
                case 'error':
                    this.tg.HapticFeedback.notificationOccurred('error');
                    break;
            }
        }
    }
}

// Создаем глобальный экземпляр
window.telegramAuth = new TelegramAuth();

console.log('✅ Модуль telegram-auth.js v3.1 загружен');