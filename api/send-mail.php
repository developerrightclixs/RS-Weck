<?php
/**
 * Shared mailer for every form on the site. The browser posts JSON with a
 * "form" key (booking | quote | lunch) and the fields for that form; this
 * script validates them and emails the request over SMTP with PHPMailer.
 *
 * SMTP settings come from environment variables (on Vercel) or api/config.php
 * (see config.example.php). Any SMTP account works: Gmail, Google Workspace,
 * Microsoft 365, or a hosting mailbox.
 */

declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

/* ---------- Form definitions ----------
 * Each field: key => [label, max length, required]
 * 'name' / 'email' name the fields used for the email's Reply-To.
 */
$forms = [
    'booking' => [
        'title'   => 'New lunch meeting request',
        'subject' => 'Lunch meeting request: {full_name} ({date} at {time})',
        'name'    => 'full_name',
        'email'   => 'email',
        'fields'  => [
            'date'             => ['Requested Date', 100, true],
            'time'             => ['Requested Time', 100, true],
            'full_name'        => ['Full Name', 120, true],
            'email'            => ['Email', 200, true],
            'phone'            => ['Phone', 50, true],
            'company'          => ['Firm or Company', 200, false],
            'meeting_type'     => ['Format', 100, false],
            'service_type'     => ['Service', 200, false],
            'property_address' => ['Property Address', 300, false],
            'message'          => ['Notes', 5000, false],
        ],
    ],
    'quote' => [
        'title'   => 'New quote request',
        'subject' => 'Quote request: {name}',
        'name'    => 'name',
        'email'   => 'email',
        'fields'  => [
            'name'    => ['Full Name', 120, true],
            'email'   => ['Email', 200, true],
            'phone'   => ['Phone', 50, false],
            'message' => ['Appraisal Needs', 5000, true],
            'page'    => ['Sent From Page', 200, false],
        ],
    ],
    'lunch' => [
        'title'   => 'New lunch meeting request',
        'subject' => 'Lunch meeting request: {name} ({date})',
        'name'    => 'name',
        'email'   => 'email',
        'fields'  => [
            'name'    => ['Full Name', 120, true],
            'company' => ['Company', 200, true],
            'email'   => ['Email', 200, true],
            'phone'   => ['Phone', 50, true],
            'topic'   => ['Discussion Topic', 200, true],
            'date'    => ['Preferred Date', 50, true],
            'page'    => ['Sent From Page', 200, false],
        ],
    ],
];

/* ---------- Setup ----------
 * Settings come from environment variables when set (Vercel: Project Settings >
 * Environment Variables), otherwise from api/config.php (local / PHP hosting).
 * Never commit real passwords: config.php is git-ignored for that reason.
 */
$configFile = __DIR__ . '/config.php';
$config = is_file($configFile) ? (require $configFile) : [];
$config['smtp'] = $config['smtp'] ?? [];

$env = static function (string $name): ?string {
    $value = getenv($name);
    return ($value === false || $value === '') ? null : $value;
};
$list = static fn (string $value): array => array_values(array_filter(array_map('trim', explode(',', $value))));

foreach (['host' => 'SMTP_HOST', 'port' => 'SMTP_PORT', 'encryption' => 'SMTP_ENCRYPTION',
          'username' => 'SMTP_USERNAME', 'password' => 'SMTP_PASSWORD'] as $key => $name) {
    if (($v = $env($name)) !== null) {
        $config['smtp'][$key] = $v;
    }
}
if (($v = $env('SMTP_VERIFY_CERTIFICATE')) !== null) {
    $config['smtp']['verify_certificate'] = !in_array(strtolower($v), ['0', 'false', 'no', 'off'], true);
}
if (($v = $env('MAIL_FROM_EMAIL')) !== null) { $config['from_email'] = $v; }
if (($v = $env('MAIL_FROM_NAME')) !== null)  { $config['from_name'] = $v; }
if (($v = $env('MAIL_TO_EMAIL')) !== null)   { $config['to_email'] = $list($v); }
if (($v = $env('MAIL_BCC')) !== null)        { $config['bcc'] = $list($v); }
if (($v = $env('MAIL_ALLOWED_ORIGINS')) !== null) { $config['allowed_origins'] = $list($v); }
if (($v = $env('MAIL_DEBUG')) !== null)      { $config['debug'] = in_array(strtolower($v), ['1', 'true', 'yes', 'on'], true); }

if (empty($config['smtp']['host']) || empty($config['smtp']['username'])) {
    respond(500, ['success' => false, 'message' => 'Mailer is not configured (set SMTP_* environment variables or api/config.php).']);
}

$autoload = __DIR__ . '/../vendor/autoload.php';
if (!is_file($autoload)) {
    respond(500, ['success' => false, 'message' => 'PHPMailer is not installed (run composer install).']);
}
require $autoload;

/* ---------- Request checks ---------- */
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $originHost = (string) parse_url($origin, PHP_URL_HOST);
    $originPort = parse_url($origin, PHP_URL_PORT);
    $sameOrigin = $originHost . ($originPort ? ':' . $originPort : '') === ($_SERVER['HTTP_HOST'] ?? '');
    if (!$sameOrigin && !in_array($origin, $config['allowed_origins'] ?? [], true)) {
        respond(403, ['success' => false, 'message' => 'Origin not allowed.']);
    }
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
/* ---------- Reserved lunch dates ----------
 * One booking per date. Stored in Upstash Redis when its REST credentials are
 * set (Vercel Marketplace > Upstash for Redis adds KV_REST_API_URL/TOKEN),
 * otherwise in api/data/reservations.json for local development.
 * To free a date again, delete its field from the "rsweck:reservations" hash
 * in the Upstash console (or remove it from the local JSON file).
 */
const RESERVATIONS_KEY = 'rsweck:reservations';
date_default_timezone_set('America/Los_Angeles');

$redisUrl   = $env('KV_REST_API_URL') ?? $env('UPSTASH_REDIS_REST_URL');
$redisToken = $env('KV_REST_API_TOKEN') ?? $env('UPSTASH_REDIS_REST_TOKEN');
$onVercel   = $env('VERCEL') !== null;
$localFile  = __DIR__ . '/data/reservations.json';

$redis = static function (array $command) use ($redisUrl, $redisToken) {
    $context = stream_context_create(['http' => [
        'method'        => 'POST',
        'header'        => "Authorization: Bearer {$redisToken}\r\nContent-Type: application/json\r\n",
        'content'       => json_encode($command),
        'timeout'       => 8,
        'ignore_errors' => true,
    ]]);
    $body = @file_get_contents(rtrim((string) $redisUrl, '/'), false, $context);
    $data = is_string($body) ? json_decode($body, true) : null;
    if (!is_array($data) || array_key_exists('error', $data)) {
        throw new RuntimeException('Reservation store error: ' . (is_array($data) ? ($data['error'] ?? '') : 'no response'));
    }
    return $data['result'] ?? null;
};

// Runs $fn with the decoded local JSON map under an exclusive lock; $fn may modify it
$withLocalFile = static function (callable $fn) use ($localFile) {
    if (!is_dir(dirname($localFile))) {
        mkdir(dirname($localFile), 0775, true);
    }
    $handle = fopen($localFile, 'c+');
    if (!$handle) {
        throw new RuntimeException('Cannot open local reservations file.');
    }
    try {
        flock($handle, LOCK_EX);
        $map = json_decode(stream_get_contents($handle) ?: '{}', true) ?: [];
        $result = $fn($map);
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($map, JSON_PRETTY_PRINT));
        return $result;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
};

$storeEnabled = ($redisUrl && $redisToken) || !$onVercel;

/** Upcoming reserved dates as YYYY-MM-DD strings */
$listReserved = static function () use ($redisUrl, $redisToken, $redis, $withLocalFile): array {
    $dates = ($redisUrl && $redisToken)
        ? (array) $redis(['HKEYS', RESERVATIONS_KEY])
        : $withLocalFile(static fn (array &$map) => array_keys($map));
    $today = date('Y-m-d');
    $dates = array_values(array_filter($dates, static fn ($d) => is_string($d) && $d >= $today));
    sort($dates);
    return $dates;
};

/** Reserves $date; returns false if someone already holds it */
$claimDate = static function (string $date, string $record) use ($redisUrl, $redisToken, $redis, $withLocalFile): bool {
    if ($redisUrl && $redisToken) {
        return (int) $redis(['HSETNX', RESERVATIONS_KEY, $date, $record]) === 1;
    }
    return $withLocalFile(static function (array &$map) use ($date, $record) {
        if (isset($map[$date])) {
            return false;
        }
        $map[$date] = json_decode($record, true);
        return true;
    });
};

$releaseDate = static function (string $date) use ($redisUrl, $redisToken, $redis, $withLocalFile): void {
    if ($redisUrl && $redisToken) {
        $redis(['HDEL', RESERVATIONS_KEY, $date]);
        return;
    }
    $withLocalFile(static function (array &$map) use ($date) {
        unset($map[$date]);
    });
};

$method = $_SERVER['REQUEST_METHOD'] ?? '';

// GET ?reserved : the calendar asks which dates are taken (dates only, no personal data)
if ($method === 'GET' && isset($_GET['reserved'])) {
    header('Cache-Control: no-store');
    if (!$storeEnabled) {
        respond(200, ['success' => true, 'enabled' => false, 'dates' => []]);
    }
    try {
        respond(200, ['success' => true, 'enabled' => true, 'dates' => $listReserved()]);
    } catch (Throwable $e) {
        error_log($e->getMessage());
        respond(503, ['success' => false, 'message' => 'Could not load reserved dates.']);
    }
}

if ($method === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST');
    header('Access-Control-Allow-Headers: Content-Type');
    respond(204, []);
}
if ($method !== 'POST') {
    respond(405, ['success' => false, 'message' => 'Method not allowed.']);
}

$raw = file_get_contents('php://input', false, null, 0, 20000) ?: '';
$input = json_decode($raw, true);
if (!is_array($input)) {
    $input = $_POST; // fall back to a normal form post
}

// Honeypot: real visitors never fill the hidden "website" field
if (!empty($input['website'])) {
    respond(200, ['success' => true]);
}

$formKey = is_string($input['form'] ?? null) ? $input['form'] : '';
if (!isset($forms[$formKey])) {
    respond(422, ['success' => false, 'message' => 'Unknown form.']);
}
$form = $forms[$formKey];

/* ---------- Validate ---------- */
$clean = static function ($value, int $max): string {
    $value = is_scalar($value) ? (string) $value : '';
    $value = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '');
    return mb_substr($value, 0, $max);
};

$values = [];
$missing = [];
foreach ($form['fields'] as $key => [$label, $max, $required]) {
    $values[$key] = $clean($input[$key] ?? '', $max);
    if ($required && $values[$key] === '') {
        $missing[] = $label;
    }
}
if ($missing) {
    respond(422, ['success' => false, 'message' => 'Missing: ' . implode(', ', $missing) . '.']);
}
$replyEmail = $values[$form['email']];
if (!filter_var($replyEmail, FILTER_VALIDATE_EMAIL)) {
    respond(422, ['success' => false, 'message' => 'Please enter a valid email address.']);
}

/* ---------- Reserve the lunch date (booking form only) ---------- */
$reservedDate = null;
if ($formKey === 'booking' && $storeEnabled) {
    $dateIso = is_string($input['date_iso'] ?? null) ? $input['date_iso'] : '';
    $day = DateTimeImmutable::createFromFormat('!Y-m-d', $dateIso);
    $tomorrow = new DateTimeImmutable('tomorrow');
    if (!$day || $day->format('Y-m-d') !== $dateIso
        || !in_array((int) $day->format('w'), [2, 3, 4], true) // Tue-Thu
        || $day < $tomorrow || $day > $tomorrow->modify('+62 days')) {
        respond(422, ['success' => false, 'message' => 'Please choose an available date on the calendar.']);
    }
    $record = json_encode([
        'name'      => $values['full_name'],
        'email'     => $values['email'],
        'phone'     => $values['phone'],
        'company'   => $values['company'],
        'booked_at' => date('c'),
    ]);
    try {
        if (!$claimDate($dateIso, $record)) {
            respond(409, ['success' => false, 'reserved' => true, 'message' => 'This date has already been reserved. Please choose another date.']);
        }
    } catch (Throwable $e) {
        error_log($e->getMessage());
        respond(503, ['success' => false, 'message' => 'Could not check the calendar right now. Please try again.']);
    }
    $reservedDate = $dateIso;
}

/* ---------- Build the email ---------- */
$rows = '';
$text = '';
foreach ($form['fields'] as $key => [$label]) {
    if ($values[$key] === '') {
        continue;
    }
    $rows .= '<tr><th align="left" style="padding:8px 12px;background:#f4f4f4;border:1px solid #ddd;white-space:nowrap;vertical-align:top">'
        . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</th>'
        . '<td style="padding:8px 12px;border:1px solid #ddd">' . nl2br(htmlspecialchars($values[$key], ENT_QUOTES, 'UTF-8')) . '</td></tr>';
    $text .= $label . ': ' . $values[$key] . "\n";
}
$title = $form['title'];
$html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">'
    . '<h2 style="color:#1b3c63">' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</h2>'
    . '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse">' . $rows . '</table>'
    . '<p style="color:#777;font-size:12px">Sent from the R. S. Weck website. Reply to this email to answer the sender.</p></div>';

$subject = preg_replace_callback('/\{(\w+)\}/', static fn ($m) => $values[$m[1]] ?? '', $form['subject']);
$subject = str_replace(["\r", "\n"], ' ', $subject);

/* ---------- Send ---------- */
$smtp = $config['smtp'] ?? [];
$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host     = (string) ($smtp['host'] ?? '');
    $mail->Port     = (int) ($smtp['port'] ?? 587);
    $mail->SMTPAuth = $smtp['auth'] ?? true;
    $mail->Username = (string) ($smtp['username'] ?? '');
    $mail->Password = (string) ($smtp['password'] ?? '');

    $encryption = strtolower((string) ($smtp['encryption'] ?? 'tls'));
    if ($encryption === 'ssl') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    } elseif ($encryption === 'tls') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } else {
        $mail->SMTPSecure = '';
        $mail->SMTPAutoTLS = false;
    }
    // Some shared hosts present a certificate for the server name rather than
    // mail.yourdomain.com; allow turning strict checking off for those only.
    if (isset($smtp['verify_certificate']) && $smtp['verify_certificate'] === false) {
        $mail->SMTPOptions = ['ssl' => ['verify_peer' => false, 'verify_peer_name' => false, 'allow_self_signed' => true]];
    }
    $mail->CharSet = 'UTF-8';
    $mail->Timeout = 20;

    // Sender: most providers require this to be the SMTP mailbox (or an alias of it)
    $fromEmail = (string) ($config['from_email'] ?? '') ?: $mail->Username;
    $mail->setFrom($fromEmail, (string) ($config['from_name'] ?? ''));

    // Recipients: one address, a comma-separated list, or an array
    $to = $config['to_email'] ?? $fromEmail;
    $recipients = is_array($to) ? $to : explode(',', (string) $to);
    foreach ($recipients as $address) {
        $address = trim((string) $address);
        if ($address !== '') {
            $mail->addAddress($address);
        }
    }
    foreach ((array) ($config['bcc'] ?? []) as $address) {
        if (trim((string) $address) !== '') {
            $mail->addBCC(trim((string) $address));
        }
    }

    $mail->addReplyTo($replyEmail, $values[$form['name']] ?? '');

    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $html;
    $mail->AltBody = $title . "\n\n" . $text;

    $mail->send();
    respond(200, ['success' => true]);
} catch (MailException $e) {
    error_log('Website mailer error (' . $formKey . '): ' . $mail->ErrorInfo);
    // The request never arrived, so give the date back
    if ($reservedDate !== null) {
        try {
            $releaseDate($reservedDate);
        } catch (Throwable $releaseError) {
            error_log($releaseError->getMessage());
        }
    }
    $message = 'The request could not be sent right now.';
    if (!empty($config['debug'])) {
        $message .= ' ' . $mail->ErrorInfo;
    }
    respond(500, ['success' => false, 'message' => $message]);
}
