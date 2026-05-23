<?php

require 'google_calendar.php';

date_default_timezone_set('America/Sao_Paulo');

$calendarId = 'geovanaborges304@gmail.com';

/* pega eventos próximas 12h */

$agora = new DateTime();

$mais12h = new DateTime('+10 minutes');

$eventos = $service->events->listEvents($calendarId, [

'timeMin' => $agora->format(DateTime::RFC3339),
'timeMax' => $mais12h->format(DateTime::RFC3339),
'singleEvents' => true,
'orderBy' => 'startTime',

]);

foreach($eventos->getItems() as $evento){

if(strpos($descricao, '[LEMBRETE_ENVIADO]') !== false){
continue;
} 

$descricao = $evento->description;

/* pega telefone */

preg_match('/Telefone:\s*(.+)/', $descricao, $matches);

if(isset($matches[1])){

$telefone = preg_replace('/[^0-9]/', '', $matches[1]);

$mensagem =
"Olá 💚\nPassando para lembrar do seu horário agendado para amanhã, em caso de desistência, responder essa mensagem. ✨";

$url = "https://api.ultramsg.com/instance176224/messages/chat";

$dados = [

'token' => 'e6tiqpy5ix2wenoo',
'to' => '55'.$telefone,
'body' => $mensagem

];

$options = [
'http' => [
'header'  => "Content-type: application/x-www-form-urlencoded",
'method'  => 'POST',
'content' => http_build_query($dados)
]
];

$context = stream_context_create($options);

file_get_contents($url, false, $context);

$evento->setDescription(
$descricao . "\n\n[LEMBRETE_ENVIADO]"
);

$service->events->update(
$calendarId,
$evento->id,
$evento
);

echo "Lembrete enviado com sucesso!";

}

}