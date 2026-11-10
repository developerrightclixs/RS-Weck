<?php
/**
 * SMTP settings for the website mailer (api/send-mail.php).
 *
 * Copy this file to config.php (same folder) and fill in the real values.
 * config.php is git-ignored so the password never ends up in the repository.
 *
 * Switching mailboxes only means changing the 'smtp' block and the addresses
 * below; no code changes. Common settings:
 *
 *   Gmail / Google Workspace (you@yourcompany.com on Google):
 *     host smtp.gmail.com, port 587, encryption 'tls'
 *     password = an App Password (needs 2-Step Verification), not the login password
 *
 *   Microsoft 365 / Outlook business:
 *     host smtp.office365.com, port 587, encryption 'tls'
 *     the mailbox must have "Authenticated SMTP" enabled in the Microsoft 365 admin center
 *
 *   Hosting mailbox (cPanel, Hostinger, GoDaddy, Namecheap, etc.):
 *     host mail.yourdomain.com (or the host your provider lists), port 465, encryption 'ssl'
 *     password = the mailbox password
 *     if you get a certificate error, set 'verify_certificate' => false
 *
 *   Zoho Mail: host smtp.zoho.com, port 465, encryption 'ssl'
 */
return [
    'smtp' => [
        'host'       => 'smtp.gmail.com',
        'port'       => 587,          // 587 = STARTTLS ('tls'), 465 = SSL ('ssl')
        'encryption' => 'tls',        // 'tls', 'ssl', or 'none'
        'username'   => 'productionmindwave@gmail.com',
        'password'   => 'YOUR_APP_PASSWORD_HERE',
        // 'verify_certificate' => false, // only if your host's certificate does not match
    ],

    // Sender of the notification. Use the SMTP mailbox itself (or an alias it may send as);
    // most providers reject or spam-flag mail "from" any other address.
    // Leave empty to use the SMTP username.
    'from_email' => 'productionmindwave@gmail.com',
    'from_name'  => 'R. S. Weck Website',

    // Where form requests are delivered: one address, 'a@x.com, b@y.com', or an array
    'to_email'   => 'productionmindwave@gmail.com',

    // Optional hidden copies, e.g. ['backup@yourcompany.com']
    'bcc'        => [],

    // Other sites allowed to post to the mailer (this site itself is always allowed)
    'allowed_origins' => [],

    // Set true while testing to see the SMTP error in the browser response
    'debug' => false,
];
