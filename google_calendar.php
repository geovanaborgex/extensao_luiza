<?php

require __DIR__ . '/vendor/autoload.php';

date_default_timezone_set('America/Sao_Paulo');

putenv('GOOGLE_APPLICATION_CREDENTIALS=' . __DIR__ . '/extensao-luiza-389d787bc94c.json');

$client = new Google_Client();
$client->useApplicationDefaultCredentials();
$client->setScopes(Google_Service_Calendar::CALENDAR);

$service = new Google_Service_Calendar($client);

?>