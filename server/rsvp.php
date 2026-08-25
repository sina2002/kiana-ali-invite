<?php
/**
 * بک‌اند ساده‌ی ثبت پاسخ‌های دعوت‌نامه (RSVP)
 * - POST (JSON): ذخیره‌ی پاسخ در rsvp-data.jsonl کنار همین فایل
 * - GET ?list=SECRET : نمایش لیست پاسخ‌ها (رمز را حتماً عوض کنید!)
 */

$SECRET   = 'change-me-please';                  // ← رمز مشاهده‌ی لیست را عوض کنید
$DATAFILE = __DIR__ . '/rsvp-data.jsonl';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');        // اگر سایت و PHP روی یک دامنه‌اند، می‌توانید حذفش کنید
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

/* ---------- مشاهده‌ی لیست ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['list']) || !hash_equals($SECRET, (string)$_GET['list'])) {
        http_response_code(403);
        echo json_encode(['error' => 'forbidden']); exit;
    }
    $rows = [];
    if (is_file($DATAFILE)) {
        foreach (file($DATAFILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $r = json_decode($line, true);
            if ($r) $rows[] = $r;
        }
    }
    echo json_encode(['count' => count($rows), 'items' => $rows],
                     JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/* ---------- ثبت پاسخ ---------- */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method not allowed']); exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

$name    = isset($data['name'])    ? trim((string)$data['name'])    : '';
$message = isset($data['message']) ? trim((string)$data['message']) : '';

if ($name === '' || mb_strlen($name) > 60 || mb_strlen($message) > 500) {
    http_response_code(422);
    echo json_encode(['error' => 'invalid input']); exit;
}

$row = [
    'name'    => $name,
    'message' => $message,
    'ts'      => isset($data['ts']) ? (int)$data['ts'] : (int)(microtime(true) * 1000),
    'ip'      => $_SERVER['REMOTE_ADDR'] ?? '',
    'saved'   => date('c'),
];

$ok = file_put_contents(
    $DATAFILE,
    json_encode($row, JSON_UNESCAPED_UNICODE) . PHP_EOL,
    FILE_APPEND | LOCK_EX
);

if ($ok === false) {
    http_response_code(500);
    echo json_encode(['error' => 'write failed']); exit;
}

echo json_encode(['ok' => true]);
