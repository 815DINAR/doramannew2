<?php
// update_watch_progress.php v1.0 - Обновление прогресса просмотра видео
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

define('USERS_DATA_FILE', __DIR__ . '/users_data.json');

// Функция загрузки данных пользователей
function loadUsersData() {
    if (file_exists(USERS_DATA_FILE)) {
        $data = json_decode(file_get_contents(USERS_DATA_FILE), true);
        return is_array($data) ? $data : [];
    }
    return [];
}

// Функция сохранения данных пользователей
function saveUsersData($data) {
    return file_put_contents(USERS_DATA_FILE, json_encode($data, JSON_PRETTY_PRINT)) !== false;
}

// Основная логика
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Метод не поддерживается']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['user_id']) || !isset($input['action'])) {
    echo json_encode(['success' => false, 'message' => 'Неверные данные запроса']);
    exit;
}

try {
    $userId = strval($input['user_id']);
    $action = $input['action'];
    
    $usersData = loadUsersData();
    
    if (!isset($usersData[$userId])) {
        throw new Exception('Пользователь не найден');
    }
    
    // Инициализация новых полей если их нет
    if (!isset($usersData[$userId]['watchedVideos'])) {
        $usersData[$userId]['watchedVideos'] = [];
    }
    if (!isset($usersData[$userId]['watchProgress'])) {
        $usersData[$userId]['watchProgress'] = [];
    }
    if (!isset($usersData[$userId]['currentSessionOrder'])) {
        $usersData[$userId]['currentSessionOrder'] = [];
    }
    if (!isset($usersData[$userId]['totalCycles'])) {
        $usersData[$userId]['totalCycles'] = 0;
    }
    
    switch ($action) {
        case 'add_watched':
            if (!isset($input['video_id'])) {
                throw new Exception('ID видео не передан');
            }
            
            $videoId = $input['video_id'];
            $timestamp = date('Y-m-d H:i:s');
            
            // Добавляем в просмотренные если еще нет
            if (!in_array($videoId, $usersData[$userId]['watchedVideos'])) {
                $usersData[$userId]['watchedVideos'][] = $videoId;
                
                // Добавляем информацию о просмотре
                $usersData[$userId]['watchProgress'][$videoId] = [
                    'watchedAt' => $timestamp,
                    'duration' => $input['duration'] ?? 5
                ];
                
                $message = 'Видео добавлено в просмотренные';
            } else {
                $message = 'Видео уже в списке просмотренных';
            }
            break;
            
        case 'update_last_video':
            if (!isset($input['video_id'])) {
                throw new Exception('ID видео не передан');
            }
            
            $usersData[$userId]['lastVideoId'] = $input['video_id'];
            $message = 'Последнее видео обновлено';
            break;
            
        case 'save_session_order':
            if (!isset($input['order'])) {
                throw new Exception('Порядок видео не передан');
            }
            
            $usersData[$userId]['currentSessionOrder'] = $input['order'];
            $message = 'Порядок сессии сохранен';
            break;
            
        case 'reset_progress':
            $usersData[$userId]['watchedVideos'] = [];
            $usersData[$userId]['watchProgress'] = [];
            $usersData[$userId]['currentSessionOrder'] = [];
            $usersData[$userId]['lastVideoId'] = null;
            $usersData[$userId]['totalCycles'] = ($usersData[$userId]['totalCycles'] ?? 0) + 1;
            $message = 'Прогресс сброшен, начат новый цикл';
            break;
            
        case 'clean_deleted_videos':
            if (!isset($input['existing_videos'])) {
                throw new Exception('Список существующих видео не передан');
            }
            
            $existingVideos = $input['existing_videos'];
            
            // Очищаем удаленные видео из watchedVideos
            $usersData[$userId]['watchedVideos'] = array_values(
                array_intersect($usersData[$userId]['watchedVideos'], $existingVideos)
            );
            
            // Очищаем из watchProgress
            foreach ($usersData[$userId]['watchProgress'] as $videoId => $data) {
                if (!in_array($videoId, $existingVideos)) {
                    unset($usersData[$userId]['watchProgress'][$videoId]);
                }
            }
            
            // Очищаем из currentSessionOrder
            $usersData[$userId]['currentSessionOrder'] = array_values(
                array_intersect($usersData[$userId]['currentSessionOrder'], $existingVideos)
            );
            
            $message = 'Удаленные видео очищены';
            break;
            
        default:
            throw new Exception('Неизвестное действие: ' . $action);
    }
    
    // Обновляем время последнего изменения
    $usersData[$userId]['last_modified'] = date('Y-m-d H:i:s');
    
    if (!saveUsersData($usersData)) {
        throw new Exception('Ошибка сохранения данных');
    }
    
    echo json_encode([
        'success' => true,
        'message' => $message,
        'watch_data' => [
            'watchedVideos' => $usersData[$userId]['watchedVideos'],
            'watchedCount' => count($usersData[$userId]['watchedVideos']),
            'lastVideoId' => $usersData[$userId]['lastVideoId'] ?? null,
            'totalCycles' => $usersData[$userId]['totalCycles'] ?? 0
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>