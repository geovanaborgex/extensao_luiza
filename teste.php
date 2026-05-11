<?php

require 'google_calendar.php';

$calendarId = 'geovanaborges304@gmail.com';

$evento = new Google_Service_Calendar_Event([
    'summary' => 'maquiagem laura',
    
    'start' => [
        'dateTime' => '2026-05-13T10:00:00',
        'timeZone' => 'America/Sao_Paulo',
    ],
    
    'end' => [
        'dateTime' => '2026-05-13T12:00:00',
        'timeZone' => 'America/Sao_Paulo',
    ],
]);

$service->events->insert($calendarId, $evento);

echo "Evento criado com sucesso!";