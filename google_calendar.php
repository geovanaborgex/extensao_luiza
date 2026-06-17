<?php

require __DIR__ . '/vendor/autoload.php';

date_default_timezone_set('America/Sao_Paulo');

/*
|--------------------------------------------------------------------------
| Credenciais Google no Render
|--------------------------------------------------------------------------
*/

$credentialsJson = getenv('GOOGLE_CREDENTIALS');

if (!$credentialsJson) {
    die('Variável GOOGLE_CREDENTIALS não configurada no Render.');
}

$tempCredentialsFile = __DIR__ . '/google_credentials.json';

file_put_contents($tempCredentialsFile, $credentialsJson);

putenv('GOOGLE_APPLICATION_CREDENTIALS=' . $tempCredentialsFile);

/*
|--------------------------------------------------------------------------
| Google Calendar
|--------------------------------------------------------------------------
*/

$client = new Google_Client();
$client->useApplicationDefaultCredentials();
$client->setScopes([
    Google_Service_Calendar::CALENDAR
]);

$service = new Google_Service_Calendar($client);

?>
